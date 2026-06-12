import { router } from 'expo-router'
import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { ExerciseCard } from '@/features/exercises/components/ExerciseCard'
import { useExercises } from '@/features/exercises/hooks/use-exercises'
import { mapExerciseError } from '@/features/exercises/utils/exercise-errors'
import { spacing } from '@/shared/theme/tokens'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingIndicator,
  Screen,
  Text,
  TextInput,
} from '@/shared/ui/primitives'

export default function ExercisesScreen() {
  const { data: exercises, isLoading, error, refetch, isRefetching } = useExercises()
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <LoadingIndicator label="Loading exercises" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen style={{ gap: spacing[4], justifyContent: 'center' }}>
        <ErrorState title={mapExerciseError(error)} />
        <Button label="Retry" onPress={() => void refetch()} />
      </Screen>
    )
  }

  const handleCreateNew = () => {
    router.push('/(authenticated)/exercises/new')
  }

  if (!exercises || exercises.length === 0) {
    return (
      <Screen style={{ gap: spacing[4], justifyContent: 'center' }}>
        <EmptyState title="No exercises found. Add your first exercise!" />
        <Button label="Create Exercise" onPress={handleCreateNew} />
      </Screen>
    )
  }

  const filteredExercises = exercises.filter((exercise) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      exercise.name.toLowerCase().includes(query) ||
      exercise.description?.toLowerCase().includes(query)
    )
  })

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[4],
        }}
      >
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24 }}>Exercises</Text>
        <Button label="New" onPress={handleCreateNew} variant="primary" />
      </View>
      <TextInput
        placeholder="Search exercises..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ marginBottom: spacing[4] }}
      />
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => router.push(`/(authenticated)/exercises/${item.id}`)}
          />
        )}
        ListEmptyComponent={<EmptyState title="No exercises match your search query." />}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingBottom: spacing[4] }}
      />
    </Screen>
  )
}
