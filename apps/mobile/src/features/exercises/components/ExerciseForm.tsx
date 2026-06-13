import * as ImagePicker from 'expo-image-picker'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, View } from 'react-native'
import { useUploadImage } from '@/features/images/hooks/use-upload-image'
import { colors, radius, spacing } from '@/shared/theme/tokens'
import { Button, Card, FormField, Text, TextInput } from '@/shared/ui/primitives'
import { EXERCISE_TYPE_OPTIONS, MUSCLE_GROUP_OPTIONS } from '../constants/exercise-options'
import { type ExerciseFormValues, exerciseFormResolver } from '../schemas/exercise-form'
import { ExerciseSelectField } from './ExerciseSelectField'

export type { ExerciseFormValues }

export interface ExerciseFormProps {
  initialValues?: Partial<ExerciseFormValues>
  onSubmit: (values: ExerciseFormValues) => void | Promise<void>
  loading?: boolean
  submitLabel?: string
  generalError?: string | null
}

export function ExerciseForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Guardar',
  generalError,
}: ExerciseFormProps): ReactNode {
  const { t } = useTranslation()
  const cleanInitialValues = initialValues || {}
  const sanitizedInitialValues = { ...cleanInitialValues }
  for (const key of Object.keys(sanitizedInitialValues) as Array<keyof ExerciseFormValues>) {
    if (sanitizedInitialValues[key] === undefined) {
      delete sanitizedInitialValues[key]
    }
  }

  const [localUri, setLocalUri] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const { mutate: uploadImage, isPending: isUploading } = useUploadImage()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: exerciseFormResolver,
    defaultValues: {
      name: '',
      description: '',
      type: 'WEIGHT_REPS',
      primaryMuscleGroup: 'OTHER',
      secondaryMuscleGroup: null,
      imageId: null,
      ...sanitizedInitialValues,
    },
  })

  const handleSelectGallery = async (onChange: (id: number | null) => void) => {
    setImageError(null)
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setImageError(t('exerciseForm.errors.galleryAccess'))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      })

      const asset = result.assets?.[0]
      if (!asset) {
        return
      }
      setLocalUri(asset.uri)

      const uploadParams: { uri: string; filename?: string; mimeType?: string } = {
        uri: asset.uri,
      }
      if (asset.fileName !== null && asset.fileName !== undefined) {
        uploadParams.filename = asset.fileName
      }
      if (asset.mimeType !== null && asset.mimeType !== undefined) {
        uploadParams.mimeType = asset.mimeType
      }

      uploadImage(uploadParams, {
        onSuccess: (data) => {
          onChange(data.id)
        },
        onError: () => {
          setLocalUri(null)
          setImageError(t('exerciseForm.errors.uploadFailed'))
        },
      })
    } catch (_err) {
      setImageError(t('exerciseForm.errors.galleryAccess'))
    }
  }

  const handleTakeCamera = async (onChange: (id: number | null) => void) => {
    setImageError(null)
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setImageError(t('exerciseForm.errors.cameraAccess'))
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      })

      const asset = result.assets?.[0]
      if (!asset) {
        return
      }
      setLocalUri(asset.uri)

      const uploadParams: { uri: string; filename?: string; mimeType?: string } = {
        uri: asset.uri,
      }
      if (asset.fileName !== null && asset.fileName !== undefined) {
        uploadParams.filename = asset.fileName
      }
      if (asset.mimeType !== null && asset.mimeType !== undefined) {
        uploadParams.mimeType = asset.mimeType
      }

      uploadImage(uploadParams, {
        onSuccess: (data) => {
          onChange(data.id)
        },
        onError: () => {
          setLocalUri(null)
          setImageError(t('exerciseForm.errors.uploadFailed'))
        },
      })
    } catch (_err) {
      setImageError(t('exerciseForm.errors.cameraAccess'))
    }
  }

  const handleRemoveImage = (onChange: (id: number | null) => void) => {
    setLocalUri(null)
    onChange(null)
    setImageError(null)
  }

  const onFormSubmit = async (data: ExerciseFormValues) => {
    await onSubmit({
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
  }

  const translatedTypeOptions = EXERCISE_TYPE_OPTIONS.map((opt) => ({
    ...opt,
    label: t(`exercises.types.${opt.value}`),
  }))

  const translatedMuscleOptions = MUSCLE_GROUP_OPTIONS.map((opt) => ({
    ...opt,
    label: t(`exercises.muscles.${opt.value}`),
  }))

  const actualSubmitLabel = submitLabel === 'Guardar' ? t('common.save') : submitLabel

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
      {generalError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{generalError}</Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label={t('exerciseForm.nameLabel')} error={errors.name?.message}>
            <TextInput
              placeholder={t('exerciseForm.namePlaceholder')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              editable={!loading}
              accessibilityLabel={t('exerciseForm.nameLabelClean')}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField label={t('exerciseForm.descriptionLabel')} error={errors.description?.message}>
            <TextInput
              placeholder={t('exerciseForm.descriptionPlaceholder')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing[2] }}
              editable={!loading}
              accessibilityLabel={t('exerciseForm.descriptionLabel')}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label={t('exerciseForm.typeLabel')}
            value={value}
            options={translatedTypeOptions}
            onChange={(val) => {
              if (val) onChange(val)
            }}
            error={errors.type?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="primaryMuscleGroup"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label={t('exerciseForm.primaryMuscleLabel')}
            value={value}
            options={translatedMuscleOptions}
            onChange={(val) => {
              if (val) onChange(val)
            }}
            error={errors.primaryMuscleGroup?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="secondaryMuscleGroup"
        render={({ field: { onChange, value } }) => (
          <ExerciseSelectField
            label={t('exerciseForm.secondaryMuscleLabel')}
            value={value}
            options={translatedMuscleOptions}
            onChange={onChange}
            error={errors.secondaryMuscleGroup?.message}
            placeholder={t('common.none')}
            allowClear
          />
        )}
      />
      <Controller
        control={control}
        name="imageId"
        render={({ field: { onChange, value } }) => {
          const hasImage = !!value || !!localUri

          return (
            <Card style={{ gap: spacing[3] }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 }}>
                {t('exerciseForm.imageTitle')}
              </Text>

              {localUri ? (
                <View
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 180,
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Image
                    source={{ uri: localUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    accessibilityLabel="Vista previa de imagen"
                  />
                  {isUploading && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(11, 15, 20, 0.6)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                        {t('exerciseForm.uploading')}
                      </Text>
                    </View>
                  )}
                </View>
              ) : value ? (
                <View
                  accessibilityLabel="Vista previa de imagen"
                  style={{
                    width: '100%',
                    height: 120,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.success,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: spacing[3],
                    gap: spacing[1],
                  }}
                >
                  <Text
                    style={{
                      color: colors.success,
                      fontFamily: 'SpaceGrotesk_700Bold',
                      fontSize: 16,
                    }}
                  >
                    {t('exerciseForm.imageSaved')}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {t('exerciseForm.serverId', { id: value })}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: 120,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                    {t('exerciseForm.noImage')}
                  </Text>
                </View>
              )}

              {imageError ? (
                <Text
                  accessibilityLabel="Error de imagen"
                  style={{ color: colors.danger, fontSize: 14 }}
                >
                  {imageError}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('exerciseForm.chooseGallery')}
                    variant="outline"
                    onPress={() => handleSelectGallery(onChange)}
                    disabled={loading || isUploading}
                    accessibilityLabel={t('exerciseForm.chooseGallery')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('exerciseForm.takePhoto')}
                    variant="outline"
                    onPress={() => handleTakeCamera(onChange)}
                    disabled={loading || isUploading}
                    accessibilityLabel={t('exerciseForm.takePhoto')}
                  />
                </View>
              </View>

              {hasImage ? (
                <Button
                  label={t('exerciseForm.removeImage')}
                  variant="secondary"
                  onPress={() => handleRemoveImage(onChange)}
                  disabled={loading || isUploading}
                  accessibilityLabel={t('exerciseForm.removeImage')}
                />
              ) : null}
            </Card>
          )
        }}
      />

      <Button
        label={actualSubmitLabel}
        onPress={handleSubmit(onFormSubmit)}
        loading={loading}
        disabled={loading || isUploading}
      />
    </ScrollView>
  )
}
