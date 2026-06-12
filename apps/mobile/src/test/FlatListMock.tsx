import React from 'react'

export interface FlatListMockProps<T> {
  data?: readonly T[] | null
  renderItem: (info: {
    item: T
    index: number
    separators: {
      highlight: () => void
      unhighlight: () => void
      updateProps: () => void
    }
  }) => React.ReactNode
  keyExtractor?: (item: T, index: number) => string
  ListEmptyComponent?: React.ReactNode | (() => React.ReactNode)
}

const FlatListMock = React.forwardRef(<T,>(props: FlatListMockProps<T>, _ref: unknown) => {
  const data = props.data || []
  if (data.length === 0 && props.ListEmptyComponent) {
    const empty =
      typeof props.ListEmptyComponent === 'function'
        ? (props.ListEmptyComponent as () => React.ReactNode)()
        : props.ListEmptyComponent
    return <React.Fragment>{empty}</React.Fragment>
  }

  return (
    <React.Fragment>
      {data.map((item, index) => {
        const key = props.keyExtractor ? props.keyExtractor(item, index) : String(index)
        return (
          <React.Fragment key={key}>
            {props.renderItem({
              item,
              index,
              separators: {
                highlight: () => {},
                unhighlight: () => {},
                updateProps: () => {},
              },
            })}
          </React.Fragment>
        )
      })}
    </React.Fragment>
  )
})

FlatListMock.displayName = 'FlatList'

export default FlatListMock
