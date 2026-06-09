import { Box, ButtonGroup, IconButton, useColorModeValue, SimpleGrid } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { GiHouse, GiGymBag, GiWeightLiftingUp, GiPerson, GiSettingsKnobs } from 'react-icons/gi'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { Roles } from '../../types'

export default function MainNavigation () {
  const location = useLocation()
  const { user } = useContext(AuthContext)
  const [isAdminOrModerator, setIsAdminOrModerator] = useState(false)

  useEffect(() => {
    if ((user?.roles) != null) {
      setIsAdminOrModerator(user.roles.includes('ROLE_ADMIN' as Roles) || user.roles.includes('ROLE_MODERATOR' as Roles))
    }
  }, [user])

  return (
    <Box
      position='fixed'
      bottom={0}
      width='100%'
      py={2}
      px={{ base: 4, md: 6, lg: 8 }}
      bg={useColorModeValue('gray.100', 'gray.900')}
      borderTop='1px solid'
      boxShadow='0 -2px 8px rgba(255, 189, 32, 0.05)'
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      zIndex='sticky'
    >
      <ButtonGroup minW='100%' isAttached justifyContent='space-between'>
        <SimpleGrid
          columns={isAdminOrModerator ? 5 : 4}
          spacing={2}
          justifyContent='space-between'
          alignItems='center'
          w='100%'
        >
          <IconButton
            as={RouterLink}
            to='/'
            aria-label='Home'
            variant='navigation'
            icon={<GiHouse />}
            isActive={location.pathname === '/'}
          />
          <IconButton
            as={RouterLink}
            to='/workout'
            aria-label='Workout'
            variant='navigation'
            icon={<GiWeightLiftingUp />}
            isActive={location.pathname === '/workout'}
          />
          <IconButton
            as={RouterLink}
            to='/exercises'
            aria-label='Exercises'
            variant='navigation'
            icon={<GiGymBag />}
            isActive={location.pathname === '/exercises'}
          />
          <IconButton
            as={RouterLink}
            to='/me'
            aria-label='Me'
            variant='navigation'
            icon={<GiPerson />}
            isActive={location.pathname === '/me'}
          />
          {isAdminOrModerator && <IconButton
            as={RouterLink}
            to='/admin'
            aria-label='Admin'
            variant='navigation'
            icon={<GiSettingsKnobs />}
            isActive={location.pathname === '/admin'}
                                 />}
        </SimpleGrid>
      </ButtonGroup>
    </Box>
  )
}
