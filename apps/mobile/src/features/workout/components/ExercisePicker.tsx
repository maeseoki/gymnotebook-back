import type { ExerciseResponse } from '@gymnotebook/contracts'
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useExercises } from '@/features/exercises/hooks/use-exercises'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, ErrorState, LoadingIndicator, Text, TextInput } from '@/shared/ui/primitives'

interface ExercisePickerProps {
  visible: boolean
  onClose: () => void
  onSelect: (exercise: ExerciseResponse) => void
  alreadySelectedIds: number[]
}

export function ExercisePicker({
  visible,
  onClose,
  onSelect,
  alreadySelectedIds,
}: ExercisePickerProps) {
  const { data: exercises = [], isLoading, isError, error } = useExercises()
  const [search, setSearch] = useState('')

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const isNotSelected = !alreadySelectedIds.includes(ex.id)
    return matchesSearch && isNotSelected
  })

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Seleccionar Ejercicio</Text>
          <Button
            label="Cerrar"
            variant="outline"
            onPress={onClose}
            accessibilityLabel="Cerrar Seleccion Ejercicio"
          />
        </View>

        <TextInput
          placeholder="Buscar ejercicio..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          accessibilityLabel="Buscar Ejercicio Input"
        />

        {isLoading ? (
          <View style={styles.center}>
            <LoadingIndicator label="Cargando ejercicios" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <ErrorState title={error?.message || 'Error cargando ejercicios'} />
          </View>
        ) : filteredExercises.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {search ? 'No se encontraron ejercicios.' : 'No hay ejercicios disponibles.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item)
                  onClose()
                }}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ${item.name}`}
              >
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.type}</Text>
                    </View>
                    <View style={[styles.badge, styles.muscleBadge]}>
                      <Text style={styles.badgeText}>{item.primaryMuscleGroup}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
    marginTop: spacing[4],
  },
  title: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  searchInput: {
    marginBottom: spacing[4],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  list: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  itemPressed: {
    backgroundColor: colors.surfacePressed,
  },
  itemMain: {
    gap: spacing[2],
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  muscleBadge: {
    borderColor: colors.primary,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
})
