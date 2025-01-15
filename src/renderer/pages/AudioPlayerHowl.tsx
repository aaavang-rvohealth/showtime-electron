import { Button, HStack, Kbd, Progress, useToast, VStack, Text, Tooltip } from '@chakra-ui/react';
import React, { useContext, useEffect, useState } from 'react';
import { useAudio, useInterval, useKeyPressEvent } from 'react-use';
import { useHowl } from 'rehowl';
import { UserSettingsContext } from '../providers/UserSettingsProvider';
import { start } from 'node:repl';

export type AudioPlayerHowlProps = {
  src: string;
  autoPlay?: boolean;
  onEnd: () => void;
  initialFocusRef?: any;
  showMode?: boolean;
}

export const AudioPlayer = (props: AudioPlayerHowlProps) => {
  const toast = useToast();
  const [userSettings] = useContext(UserSettingsContext);
  const [isFading, setIsFading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate,setRate] = useState(1)
  const { howl, state } = useHowl({
    src: props.src,
    html5: userSettings.useHTML5Audio,
  })

  useEffect(() => {
    console.log('jukebox props', props)
  }, []);

  useEffect(() => {
    if (howl) {
      howl.on("load", () => {
        setCurrentTime(0)
        if(props.autoPlay && userSettings.enableFineGrainAutoplay) {
          howl.volume(1)
          howl.play();
          setIsPlaying(true)
          setStartTime(new Date().getTime())
          setAccumulatedTime(0)
        }
      });

      howl.on("end", () => {
        props.onEnd();
        setCurrentTime(0)
        setStartTime(undefined)
        setAccumulatedTime(0)
        setIsPlaying(false)
      });
    }
  }, [howl]);

  useEffect(() => {
    howl?.rate(rate)
  }, [rate]);

  const handleIncreaseRate = () => {
    setRate(parseFloat(Math.min(rate + .05, 4).toFixed(2)))
  }

  const handleDecreaseRate = () => {
    setRate(parseFloat(Math.max(rate - .05, .5).toFixed(2 )))
  }

  const handlePlayPause = () => {
    // blur play-pause button
    document.getElementById('play-pause-button')?.blur();
    if (howl?.playing()) {
      howl?.pause()
      setIsPlaying(false)
      setAccumulatedTime(new Date().getTime()-startTime!)
    } else {
      setIsPlaying(true)
      howl?.volume(1)
      howl?.play();
      setStartTime(new Date().getTime())
    }
  };

  useKeyPressEvent(' ', handlePlayPause);

  useInterval(() => {
      if ((howl?.volume() ?? 0) <= 0) {
        toast({
          title: 'Faded out and moving on!',
          status: 'success',
          duration: 2000,
          isClosable: true
        });
        howl?.pause();
        setIsFading(false);
        props.onEnd();
        setCurrentTime(0)
        setIsPlaying(false)
        howl?.seek(0)
        howl?.volume(1);
      } else if(howl?.playing()) {
        howl?.volume(parseFloat(Math.max(0, howl?.volume() - 0.1).toFixed(1)));
      }
    },
    isFading ? 250 : null
  );

  const formatSecondsToLabel = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleRestart = () => {
    if (howl?.playing()) {
      toast({
        title: 'Cannot restart while playing',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
    } else {
      toast({
        title: 'Restarting',
        status: 'info',
        duration: 2000,
        isClosable: true
      });
      howl?.seek(0);
      setCurrentTime(0);
    }
    // blur reset button
    document.getElementById('reset-button')?.blur();
  };

  const handleFade = () => {
    toast({
      title: 'Fading out',
      status: 'info',
      duration: 2000,
      isClosable: true
    });
    setIsFading(true);

    // blur fade button
    document.getElementById('fade-button')?.blur();
  };

  useInterval(() => {
    if(howl?.playing()) {
      setCurrentTime(howl?.seek() ?? 0);
    }
  }, 100);

  const duration = howl?.duration() ?? -1;
  return (
    <VStack w={'100%'}>
      <pre>{formatSecondsToLabel(currentTime)}/{formatSecondsToLabel(duration)}</pre>
      <Progress cursor={'pointer'} hasStripe value={(currentTime / duration) * 100} w={'100%'} onClick={(e) => {
        const percent = e.nativeEvent.offsetX / e.currentTarget.offsetWidth;
        howl?.seek(duration * percent);
        setCurrentTime(howl?.seek() ?? 0)
      }} />
      <HStack w={'100%'} justifyContent={'space-between'}>
        <Button ref={props.initialFocusRef}
                id={'play-pause-button'} onClick={handlePlayPause}
                colorScheme={'green'}>{isPlaying ? 'Pause' : 'Play'}</Button>
        <Button id={'fade-button'} onClick={handleFade} colorScheme={'blue'} isDisabled={!isPlaying}>Fade out (2.5
          secs)</Button>
        <Button id={'reset-button'} onClick={handleRestart} colorScheme={'red'} variant={'outline'}
                isDisabled={isPlaying || currentTime <= 0}>Restart</Button>
      </HStack>
      {!props.showMode && userSettings.useHTML5Audio && <HStack w={'100%'} justifyContent={'space-between'}>
        <pre>{`Rate: ${rate}x`}</pre>
        <Button id={'decrease-rate'} onClick={handleDecreaseRate}
                colorScheme={'gray'}>Decrease Rate</Button>
        <Button id={'increase-rate'} onClick={handleIncreaseRate}
                colorScheme={'gray'}>Increase Rate</Button>
      </HStack>}
      <Text>Press <Kbd>Space</Kbd> to Play/Pause</Text>
    </VStack>
  );
};
