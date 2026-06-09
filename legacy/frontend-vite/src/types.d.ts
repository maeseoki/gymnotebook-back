export interface JwtPayload {
  sub: string
  roles: Role[]
  iat: number
  exp: number
}

export interface User {
  authenticated: boolean
  name?: string
  authToken?: string
  roles?: Roles[]
}
export interface Role {
  authority: Roles
}

// Roles can be also empty
export enum Roles {
  ROLE_USER = 'ROLE_USER',
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_MODERATOR = 'ROLE_MODERATOR'
}

export interface Children {
  children?: ReactNode
}

export interface AuthContextData {
  user: User | null
  setUser: (token: string | null) => void
  removeUser: () => void
}

export interface Auth {
  user: User | null
  addUser: (token: string | null) => void
  removeUser: () => void
}

export interface LocalStorage {
  value: string | null
  setItem: (value: string) => void
  removeItem: () => void
}

export interface GenericResponse {
  message: string
}

type Token = `${string}.${string}.${string}`

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  id: number
  username: string
  email: string
  roles: Roles[]
  accessToken: Token
  tokenType: 'Bearer'
}

export interface SignUpRequest {
  username: string
  email: string
  password: string
}

export interface SignUpResponse extends GenericResponse {}

export interface VerifyUserRequest {
  username: string
  email: string
}

export interface VerifyUserResponse extends GenericResponse {}

export interface LogoutResponse extends GenericResponse {}

export interface HeaderProps {
  extraComponent?: React.ReactNode
}

export enum MuscleGroups {
  ABDOMINALS = 'ABDOMINALS',
  ABDUCTORS = 'ABDUCTORS',
  BICEPS = 'BICEPS',
  CALVES = 'CALVES',
  CARDIO = 'CARDIO',
  CHEST = 'CHEST',
  FOREARMS = 'FOREARMS',
  FULL_BODY = 'FULL_BODY',
  GLUTES = 'GLUTES',
  HAMSTRINGS = 'HAMSTRINGS',
  LATS = 'LATS',
  LOWER_BACK = 'LOWER_BACK',
  QUADRICEPS = 'QUADRICEPS',
  SHOULDERS = 'SHOULDERS',
  TRAPS = 'TRAPS',
  TRICEPS = 'TRICEPS',
  UPPER_BACK = 'UPPER_BACK',
  OTHER = 'OTHER'
}

export enum ExerciseTypeType {
  WEIGHT = 'WEIGHT',
  REPS = 'REPS',
  TIME = 'TIME',
  DISTANCE = 'DISTANCE',
  WEIGHT_REPS = 'WEIGHT_REPS',
  TIME_DISTANCE = 'TIME_DISTANCE'
}

export interface ExerciseType {
  id?: number
  name: string
  description?: string
  imageId?: number | null
  type: ExerciseTypeType
  primaryMuscleGroup: MuscleGroups
  secondaryMuscleGroup?: MuscleGroups | null
}

export interface ExerciseTypeUpdate extends ExerciseType {
  id: number
}

export interface ExerciseTypeWithImage extends ExerciseType {
  imageUrl?: string
}

export interface userResponse {
  id: number
  username: string
  email: string
  roles: Array<{
    id: number
    name: Roles
  }>
}

type UUID = `${string}-${string}-${string}-${string}-${string}`

interface Workout {
  uuid: UUID
  workoutSets?: WorkoutSet[]
  startDate: Date
  endDate?: Date
  notes?: string
}

interface WorkoutSet {
  exercise: ExerciseTypeWithImage
  sets?: SetType[]
  startDate: Date
  endDate?: Date
  notes?: string
}

interface SetType {
  reps?: number
  weight?: number
  time?: number
  distance?: number
  notes?: string
  isDropSet: boolean
  startDate: Date
}

interface Exercise {
  id: number
  name: string
  exerciseImageId?: number | null
  type: ExerciseTypeType
}

interface WorkoutState {
  workout: Workout | null
  setWorkout: Dispatch<SetStateAction<Workout | null>>
}

interface DiscardWorkoutDialogProps {
  isDiscardOpen: boolean
  onDiscardClose: () => void
  discardRef: LegacyRef<HTMLButtonElement> | undefined
  confirmDiscardWorkout: () => void
}

interface EndWorkoutDialogProps {
  isEndOpen: boolean
  onEndClose: () => void
  endRef: LegacyRef<HTMLButtonElement> | undefined
  confirmEndWorkout: () => void
}

interface ExercisesProps {
  onExerciseClick?: (exercise: ExerciseTypeWithImage) => void
}

interface WorkoutControlsProps {
  setIsAddingExercise: Dispatch<SetStateAction<boolean>>
}

interface AddSetModalProps {
  isOpen: boolean
  onClose: () => void
  currentWorkoutSet: WorkoutSet | null
  onAccept: (newSet: SetType) => void
}

interface ExerciseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseId: number
}

interface SetProps extends SetType {
  index: number
  exerciseType: ExerciseTypeType
}

interface SetsTableHeadProps {
  exerciseType: ExerciseTypeType
}

export interface SetResponse {
  id: number
  reps: number
  weight: number
  time: number
  distance: number
  notes: string | null
  startDate: string
  dropSet: boolean
}

export interface WorkoutSetResponse {
  id: number
  startDate: string
  endDate: string | null
  exercise: ExerciseType
  sets: SetResponse[]
  notes: string | null
}

export interface Sort {
  empty: boolean
  sorted: boolean
  unsorted: boolean
}

export interface Pageable {
  sort: Sort
  offset: number
  pageSize: number
  pageNumber: number
  unpaged: boolean
  paged: boolean
}

export interface WorkoutSetsPageResponse {
  content: WorkoutSetResponse[]
  pageable: Pageable
  last: boolean
  totalElements: number
  totalPages: number
  size: number
  number: number
  sort: Sort
  numberOfElements: number
  first: boolean
  empty: boolean
}

export interface ExerciseDetailProps {
  exerciseId?: number
}
