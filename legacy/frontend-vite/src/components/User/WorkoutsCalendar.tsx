import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import '../../assets/scss/calendar.scss'
import { Flex } from '@chakra-ui/react'
import { getWorkoutDaysForMonth, getWorkoutsByDate } from '../../services/workoutService'

export default function WorkoutsCalendar () {
  const [workoutDays, setWorkoutDays] = useState<number[]>([]) // We store the workout days here
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // We store the selected date here

  // Recuperamos los días de entrenamiento del mes actual
  const fetchWorkoutDays = async (month: number, year: number) => {
    const data = await getWorkoutDaysForMonth(month, year)
    setWorkoutDays(data)
  }

  // Recuperamos los entrenamientos del día seleccionado
  const fetchWorkoutDay = async (value: Date | Date[] | null) => {
    if (value instanceof Date) {
      const data = await getWorkoutsByDate(value)
      console.log(data)
    }
  }

  useEffect(() => {
    void fetchWorkoutDays(selectedDate.getMonth() + 1, selectedDate.getFullYear()) // Fetch the workout days when the component mounts
  }, [selectedDate])

  const onActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      void fetchWorkoutDays(activeStartDate.getFullYear(), activeStartDate.getMonth() + 1)
    }
  }

  const tileClassName = ({ date, view }: { date: Date, view: string }) => {
    // Add a class to the days that have workouts
    if (view === 'month' && workoutDays.includes(date.getDate())) {
      return 'workout-day'
    }
  }

  const handleDateChange = (value: Date | Date[] | [Date | null, Date | null] | null) => {
    if (value) {
      if (Array.isArray(value)) {
        if (value[0] instanceof Date) {
          setSelectedDate(value[0])
        }
      } else if (value instanceof Date) {
        setSelectedDate(value)
      }
    }
  }

  return (
    <Flex justifyContent='center' mt={4}>
      <Calendar
        className='react-calendar__theme--dark'
        onChange={handleDateChange}
        value={selectedDate}
        onClickDay={async (value) => await fetchWorkoutDay(value)}
        onActiveStartDateChange={onActiveStartDateChange}
        tileClassName={tileClassName}
      />

    </Flex>
  )
}
