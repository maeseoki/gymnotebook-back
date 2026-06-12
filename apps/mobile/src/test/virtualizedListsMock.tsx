import FlatListMock from './FlatListMock'

export const VirtualizedList = FlatListMock
export const VirtualizedSectionList = FlatListMock
export const keyExtractor = (_item: unknown, index: number) => String(index)

export default {
  VirtualizedList,
  VirtualizedSectionList,
  keyExtractor,
}
