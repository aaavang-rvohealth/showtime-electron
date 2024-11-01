import { CloseIcon } from '@chakra-ui/icons';
import { Badge, Box, Button, Flex, Heading, HStack, IconButton, VStack } from '@chakra-ui/react';
import React, { MutableRefObject, useCallback, useContext, useRef, useState } from 'react';
import { Dance, DanceVariant, Song } from '../database';
import { AudioPlayer } from '../pages/AudioPlayerHowl';
import { UserSettingsContext } from '../providers/UserSettingsProvider';
import { HydratedDanceVariant } from './SelectDanceModal';

export type JukeboxState = {
  showJukebox: boolean;
  song?: Song
  dance?: Dance
  variant?: DanceVariant
  onEnd?: (song: Song) => void
  closeOnEnd?: boolean
  currentTrackIndex?: number
  playlist?: HydratedDanceVariant[]
}

type JukeboxProps = {
  state: JukeboxState
  setState: (state: JukeboxState) => void
  initialFocusRef?: any
  onEnd?: (song: Song) => void
  closeOnEnd?: boolean
}

export type JukeboxReturnType = {
  jukeboxState: JukeboxState
  setJukeboxState: (state: JukeboxState) => void
  Jukebox: () => React.ReactNode;
  initialFocusRef: MutableRefObject<any>
}

export const useJukebox = (): JukeboxReturnType => {
  const [jukeboxState, setJukeboxState] = useState<JukeboxState>({
    showJukebox: false
  });
  const ref = useRef<HTMLElement>()

  const callback = useCallback(() => <Jukebox state={jukeboxState}
                                              initialFocusRef={ref}
                                              setState={setJukeboxState} />, [jukeboxState]);


  return ({
    jukeboxState,
    setJukeboxState,
    Jukebox: callback,
    initialFocusRef: ref
  });
};

const Jukebox = ({ state, setState, initialFocusRef }: JukeboxProps) => {
  const [userSettings] = useContext(UserSettingsContext);
  if (!state.showJukebox || !state.song) {
    return null;
  }

  const nextDance = () => {
    if (state.playlist && state.currentTrackIndex! < state.playlist.length - 1) {
      setState({
        ...state,
        currentTrackIndex: state.currentTrackIndex! + 1,
        song: state.playlist[state.currentTrackIndex! + 1].song,
        dance: state.playlist[state.currentTrackIndex! + 1].dance,
        variant: state.playlist[state.currentTrackIndex! + 1].danceVariant
      });
    }
  };

  const previousDance = () => {
    if (state.playlist && state.currentTrackIndex! > 0) {
      setState({
        ...state,
        currentTrackIndex: state.currentTrackIndex! - 1,
        song: state.playlist[state.currentTrackIndex! - 1].song,
        dance: state.playlist[state.currentTrackIndex! - 1].dance,
        variant: state.playlist[state.currentTrackIndex! - 1].danceVariant
      });
    }
  };

  const onEnd = () => {
    if (state.playlist) {
      if (state.currentTrackIndex! < state.playlist.length - 1) {
        nextDance();
      } else {
        state.onEnd?.(state.song!);
        if (state.closeOnEnd) {
          setState({
            showJukebox: false
          });
        }
      }
    } else {
      state.onEnd?.(state.song!);
      if (state.closeOnEnd) {
        setState({
          showJukebox: false
        });
      }
    }
  };

  const windowsFilePathTShowtimeUri = (filePath: string)=> {
    // Replace backslashes with forward slashes
    const pathWithForwardSlashes = filePath.replace(/\\/g, '/');

    // Extract the drive letter (e.g., "C:") and keep it unencoded
    const driveLetterMatch = pathWithForwardSlashes.match(/^([a-zA-Z]:)/);
    const driveLetter = driveLetterMatch ? driveLetterMatch[0] : '';

    // Get the rest of the path
    const restOfPath = pathWithForwardSlashes.slice(driveLetter.length);

    // Encode the rest of the path
    const encodedRestOfPath = encodeURIComponent(restOfPath)
      .replace(/%5C/g, '/') // Replace encoded backslashes with forward slashes
      .replace(/%3A/g, ':') // Ensure colons are decoded back to original
      .replace(/%2F/g, '/'); // Ensure forward slashes are decoded back to original

    // Construct the full file URL
    return `showtime:///${driveLetter}${encodedRestOfPath}`;
  }

  const getEncodeURI = (song: Song) => {
    if(userSettings.isWindows) {
      return windowsFilePathTShowtimeUri(song.path)
    } else {
      return encodeURI(`showtime://${song.path}`);
    }
  }

  return (
    <Box width={'100%'}>
      <HStack justifyContent={'flex-end'} marginTop={'10px'}>
        <IconButton aria-label={'close'} icon={<CloseIcon />} onClick={() => setState({
          showJukebox: false
        })} />
      </HStack>
      <>
        <Flex>
            {state.playlist && <VStack flex={'0 0 20%'} justifyContent={'center'} alignItems={'center'}>
              <Heading as={'h3'} size={'xs'}
                       minHeight={'1.2em'}>{state.currentTrackIndex! >= 1 ? state.playlist[state.currentTrackIndex! - 1].dance.title : ' '}</Heading>
              <Button colorScheme={'gray'} isDisabled={state.currentTrackIndex! < 1}
                      onClick={previousDance}>Previous</Button>
            </VStack>}
            <Flex flex={state.playlist ? '0 0 60%' : '1'} alignItems={'center'} justifyContent={'center'}>
              <VStack textAlign={'center'}>
                <Badge colorScheme={ userSettings.defaultAutoplay ? 'green' : 'gray' }>Auto Play {userSettings.defaultAutoplay ? 'Enabled' : 'Disabled'}</Badge>
                {state.currentTrackIndex !== undefined && state.playlist && (
                  <Heading as={'h2'} size={'md'}>{`${state.currentTrackIndex + 1}/${state.playlist.length}`}</Heading>)}
                {state.dance && (<Heading as={'h2'} size={'lg'}>{state.dance.title}</Heading>)}
                {state.variant && (<Heading as={'h2'} size={'md'}>{state.variant.title}</Heading>)}
                <Heading as={'h3'} size={'md'}>{state.song.title}</Heading>
              </VStack>
            </Flex>
            {state.playlist && <VStack flex={'0 0 20%'} justifyContent={'center'} alignItems={'center'}>
              <Heading as={'h3'} size={'xs'}
                       minHeight={'1.2em'}>{state.currentTrackIndex! < state.playlist.length - 1 ? state.playlist[state.currentTrackIndex! + 1].dance.title : ' '}</Heading>
              <Button colorScheme={'gray'} isDisabled={state.currentTrackIndex! >= state.playlist.length - 1}
                      onClick={nextDance}>Next</Button>
            </VStack>}
        </Flex>
      </>
      <AudioPlayer
        initialFocusRef={initialFocusRef}
        src={getEncodeURI(state.song)} onEnd={onEnd} />
    </Box>
  );
};
