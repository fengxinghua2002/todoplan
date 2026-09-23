export interface SceneryItem {
  name: string
  url: string
}

const imageModules = import.meta.glob('../assets/scenery/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const names = [
  '云岚初醒',
  '雪峰澄湖',
  '林间晨光',
  '海崖远望',
  '薰衣暮色',
  '沙丘日出',
  '静雪湖山',
  '枫林秋水',
  '海岛晨光',
  '云上梯田',
  '苔谷飞瀑',
  '星河镜湖',
  '旷野天光',
  '樱河春雾',
  '峡湾烟雨',
  '海角灯塔',
  '玄沙海岸',
  '桂岭晨雾',
]

export const sceneryItems: SceneryItem[] = Object.entries(imageModules)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, url], index) => ({ name: names[index] ?? `风景 ${index + 1}`, url }))
