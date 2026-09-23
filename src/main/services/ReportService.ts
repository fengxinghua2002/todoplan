import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Category, ReportRequest, ReportResult, Task } from '../../shared/types'
import { buildTaskForest, createTaskLookup, resolveTaskCategoryId, type TaskHierarchyNode } from '../../shared/taskHierarchy'
import type { StorageAdapter } from '../storage/StorageAdapter'

dayjs.extend(isoWeek)

export class ReportService {
  constructor(private readonly storage: StorageAdapter) {}

  async generate(input: ReportRequest): Promise<ReportResult> {
    const start = dayjs(input.startDate).startOf('day')
    const end = dayjs(input.endDate).endOf('day')
    if (!start.isValid() || !end.isValid() || start.isAfter(end)) throw new Error('报告时间范围无效')
    const [tasks, categories] = await Promise.all([this.storage.loadTasks(), this.storage.loadCategories()])
    const completed = tasks.filter((task) => task.status === 'completed' && task.completedAt && !dayjs(task.completedAt).isBefore(start) && !dayjs(task.completedAt).isAfter(end))
    const title = this.title(input.type, start)
    const lines = [`# ${title}`, '', `${this.periodWord(input.type)}共完成 ${completed.length} 项任务。`, '']
    const grouped = this.groupByCategory(completed, tasks, categories)
    for (const [name, nodes] of grouped) {
      lines.push(`## ${name}`, '')
      nodes.forEach((node) => this.renderNode(node, 0, lines))
      lines.push('')
    }
    if (!completed.length) lines.push('本周期暂无完成记录。', '')
    return { title, markdown: lines.join('\n'), suggestedFileName: `${title.replace(/\s+/g, '')}.md` }
  }

  private title(type: ReportRequest['type'], start: dayjs.Dayjs): string {
    if (type === 'week') return `${start.year()} 年第 ${start.isoWeek()} 周总结`
    if (type === 'month') return `${start.format('YYYY 年 M 月')}总结`
    return `${start.format('YYYY 年')}总结`
  }

  private periodWord(type: ReportRequest['type']): string { return type === 'week' ? '本周' : type === 'month' ? '本月' : '本年' }

  private groupByCategory(completedTasks: Task[], allTasks: Task[], categories: Category[]): Map<string, TaskHierarchyNode[]> {
    const lookup = createTaskLookup(allTasks)
    const usedIds = new Set(completedTasks.map((task) => resolveTaskCategoryId(task, lookup) ?? ''))
    const grouped = new Map<string, TaskHierarchyNode[]>()
    categories.sort((a, b) => a.sortOrder - b.sortOrder).forEach((category) => {
      if (usedIds.has(category.id)) grouped.set(category.name, buildTaskForest(completedTasks, allTasks, category.id))
    })
    if (usedIds.has('')) grouped.set('未分类', buildTaskForest(completedTasks, allTasks, undefined))
    return grouped
  }

  private renderNode(node: TaskHierarchyNode, depth: number, lines: string[]): void {
    const indent = '  '.repeat(depth)
    const title = node.contextOnly ? `**${node.task.title}**` : node.task.title
    lines.push(`${indent}- ${title}`)
    if (!node.contextOnly && node.task.completionNote) lines.push(`${indent}  - 完成备注：${node.task.completionNote}`)
    node.children.forEach((child) => this.renderNode(child, depth + 1, lines))
  }
}
