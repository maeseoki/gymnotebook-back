import { ToastProviderProps, extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  colors: {
    primary: {
      50: '#fff8e6',
      100: '#ffe7bf',
      200: '#FBB021',
      300: '#F5A101',
      400: '#ff9f00',
      500: '#e68c00',
      600: '#b36a00',
      700: '#804800',
      800: '#4d2700',
      900: '#1e0700'
    },
    secondary: {
      50: '#f1f7ff',
      100: '#d5e6fd',
      200: '#acc8fa',
      300: '#84aaf7',
      400: '#5c8cf4',
      500: '#357ef1',
      600: '#2b64c2',
      700: '#214b92',
      800: '#173262',
      900: '#0c1a33'
    },
    gradients: {
      primaryGradient: 'linear-gradient(to right, #FBB021, #b36a00)',
      primaryGradientHover: 'linear-gradient(to right, #b36a00, #FBB021)',
      secondaryGradient: 'linear-gradient(to right, #84aaf7, #357ef1)',
      secondaryGradientHover: 'linear-gradient(to right, #357ef1, #FBB021)',
      primaryToSecondary: 'linear-gradient(to right, #F5A101, #357ef1)',
      secondaryToPrimary: 'linear-gradient(to right, #357ef1, #F5A101)',
      primaryToSecondaryHover: 'linear-gradient(to right, #FBB021, #357ef1)',
      secondaryToPrimaryHover: 'linear-gradient(to right, #357ef1, #FBB021)'
    },
    shadows: {
      primary: '0 0 8px rgb(255, 189, 32)',
      secondary: '0 0 8px rgb(53, 126, 241)',
      tertiary: '0 0 8px rgb(255, 189, 32)',
      soft: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
      strong: '0 10px 15px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)',
      topGold: '0 -4px 8px rgba(255, 189, 32, 0.11)',
      topBlue: '0 -4px 8px rgba(53, 126, 241, 0.11)',
      bottomGold: '0 4px 8px rgba(255, 189, 32, 0.11)',
      bottomBlue: '0 4px 8px rgba(53, 126, 241, 0.11)'
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold'
      },
      sizes: {
        md: {
          fontSize: 'md',
          px: 4,
          py: 2
        }
      },
      variants: {
        primarySolid: {
          bg: 'primary.300',
          color: 'white',
          _hover: {
            bg: 'primary.600'
          }
        },
        secondarySolid: {
          bg: 'secondary.300',
          color: 'white',
          _hover: {
            bg: 'secondary.600'
          }
        },
        primaryOutline: {
          bg: 'transparent',
          border: '2px solid',
          borderColor: 'primary.300',
          color: 'primary.300',
          _hover: {
            bg: 'primary.300',
            color: 'white'
          }
        },
        secondaryOutline: {
          bg: 'transparent',
          border: '2px solid',
          borderColor: 'secondary.300',
          color: 'secondary.300',
          _hover: {
            bg: 'secondary.300',
            color: 'white'
          }
        },
        primaryGradient: {
          bgGradient: 'linear(to-r, primary.600, primary.300)',
          color: 'white',
          backgroundSize: '200%',
          transition: 'background-position 0.5s',
          _hover: {
            bgPos: 'right center'
          }
        },
        secondaryGradient: {
          bgGradient: 'linear(to-r, secondary.700, secondary.300)',
          color: 'white',
          backgroundSize: '200%',
          transition: 'background-position 0.5s',
          _hover: {
            bgPos: 'right center'
          }
        },
        navigation: {
          bg: 'transparent',
          border: 'none',
          color: 'primary.300',
          fontSize: '3xl',
          _hover: {
            bg: 'transparent',
            color: 'primary.600'
          },
          _active: {
            bg: 'transparent',
            color: 'secondary.300'
          }
        }
      }
    },
    Card: {
      baseStyle: {
        '--card-border-color': 'whiteAlpha.300'
      }
    },
    Icon: {
      variants: {
        lightning: {
          color: 'primary.200',
          filter: 'drop-shadow(0 0 8px rgb(255, 189, 32))'
        },
        off: {
          color: 'gray.800'
        }
      }
    }
  },
  fonts: {
    heading: '\'Space Grotesk Variable\', sans-serif',
    body: '\'Space Grotesk Variable\', sans-serif'
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false
  }
})

export const toastOptions: ToastProviderProps = {
  defaultOptions: {
    position: 'top',
    duration: 4000,
    isClosable: true,
    variant: 'solid'
  }
}
