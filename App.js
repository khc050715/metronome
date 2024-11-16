import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView, StatusBar } from 'react-native';
import { Audio } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function App() {
  const [bpm, setBpm] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundPage1, setSoundPage1] = useState(null);
  const [soundPage2, setSoundPage2] = useState(null);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  const nextTickTime = useRef(null);
  const timerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const animation = useRef(new Animated.Value(1)).current;
  const accumulatedDrift = useRef(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  async function loadSounds() {
    try {
      const { sound: sound1 } = await Audio.Sound.createAsync(
        require('./assets/metronome-tick-302ms.wav')
      );
      const { sound: sound2 } = await Audio.Sound.createAsync(
        require('./assets/metronome-tick-300ms.wav')
      );
      await sound1.setStatusAsync({ shouldPlay: false });
      await sound2.setStatusAsync({ shouldPlay: false });
      setSoundPage1(sound1);
      setSoundPage2(sound2);
      setIsSoundLoaded(true);
    } catch (error) {
      console.error("Error loading sounds: ", error);
    }
  }

  useEffect(() => {
    loadSounds();
    return () => {
      if (soundPage1) soundPage1.unloadAsync();
      if (soundPage2) soundPage2.unloadAsync();
    };
  }, []);

  const playSound = async () => {
    let currentSound = currentPage === 0 ? soundPage1 : soundPage2;
    if (currentSound && isSoundLoaded) {
      try {
        await currentSound.stopAsync();
        await currentSound.setPositionAsync(0);
        await currentSound.playAsync();
      } catch (error) {
        console.error("Error playing sound: ", error);
      }
    }
  };

  const startAnimation = () => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const scheduleTick = () => {
    const now = performance.now();
    const interval = (60 / bpm) * 1000;

    if (nextTickTime.current <= now) {
      playSound();
      startAnimation();
      const drift = now - nextTickTime.current;
      accumulatedDrift.current += drift;
      nextTickTime.current += interval;
    }

    const correctedInterval = interval - accumulatedDrift.current;
    const timeUntilNextTick = Math.max(0, nextTickTime.current - performance.now());
    timerRef.current = setTimeout(scheduleTick, Math.min(timeUntilNextTick, correctedInterval));
    accumulatedDrift.current = 0;
  };

  const handlePresetClick = (presetBpm) => {
    if (!isSoundLoaded) {
      console.warn("Sounds are not loaded yet.");
      return;
    }
  
    if (isPlaying) {
      // 메트로놈이 실행 중이면 중지
      stopMetronome();
    } else {
      // 메트로놈이 실행 중이지 않으면
      // BPM을 설정하고 메트로놈을 시작
      setBpm(presetBpm);
      startMetronome();
    }
  };
  

  const startMetronome = () => {
    nextTickTime.current = performance.now();
    accumulatedDrift.current = 0;
    scheduleTick();
    setIsPlaying(true);

    elapsedTimerRef.current = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopMetronome = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setIsPlaying(false);
  };

  const handleScroll = (event) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(pageIndex);
  };

  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };


  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.scrollViewContainer}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <StatusBar hidden={true} />

      {/* Page 1 */}
      <View style={[styles.container, styles.containerPage1]}>
        <View style={styles.flex1}></View>

        <View style={styles.flex2}>
          <Animated.View style={[styles.visualFeedback, { transform: [{ scale: animation }] }]} >
            <View style={styles.box}>
              <Text style={styles.title}>Metronome</Text>
              <Text style={styles.subtitle}>for Chromatic</Text>
              <Text style={styles.bpmText}>BPM: {bpm}</Text>
              <View style={styles.presetContainer}>
                <TouchableOpacity style={styles.presetButton} onPress={() => handlePresetClick(60)}>
                  <Text style={styles.presetButtonText}>60</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetButton} onPress={() => handlePresetClick(90)}>
                  <Text style={styles.presetButtonText}>90</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.flex3}>
          <View>
            <Text style={styles.elapsedText}>
              Total Time: {formatElapsedTime(totalElapsedTime)}
            </Text>
          </View>
        </View>
      </View>

      {/* Page 2 */}
      <View style={[styles.container, styles.containerPage2]}>
        <View style={styles.flex1}></View>

        <View style={styles.flex2}>
          <Animated.View style={[styles.visualFeedback, { transform: [{ scale: animation }] }]} >
            <View style={styles.box}>
              <Text style={styles.title}>Metronome</Text>
              <Text style={styles.subtitle}>for Chromatic (clock)</Text>
              <Text style={styles.bpmText}>BPM: {bpm}</Text>
              <View style={styles.presetContainer}>
                <TouchableOpacity style={styles.presetButton} onPress={() => handlePresetClick(60)}>
                  <Text style={styles.presetButtonText}>60</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetButton} onPress={() => handlePresetClick(90)}>
                  <Text style={styles.presetButtonText}>90</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.flex3}>
          <View>
            <Text style={styles.elapsedText}>
              Total Time: {formatElapsedTime(totalElapsedTime)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView >

  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 1,
    alignItems: 'center'
  },
  flex3: {
    flex: 1,
  },
  container: {
    width: SCREEN_WIDTH,
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1
  },
  containerPage1: {
    backgroundColor: '#032619',
  },
  containerPage2: {
    backgroundColor: '#014029',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    
  },
  bpmText: {
    fontSize: 20,
    marginVertical: 10,
    color: '#555',
    
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 15,
  },
  presetButton: {
    backgroundColor: '#014029',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 138,
  },
  presetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  visualFeedback: {
    width: 300,
    height: 300,
    backgroundColor: '#F2E4D8',
    borderRadius: 70,
    justifyContent: 'space-around',
    flexDirection: 'column'
  },
  box: {
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  elapsedText: {
    fontSize: 24,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    color: 'red'
  },
});
