import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView, StatusBar } from 'react-native';
import { Audio } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function App() {
  const [bpm, setBpm] = useState(60); // 기본 템포를 60 BPM으로 설정
  const [isPlaying, setIsPlaying] = useState(false); // 재생 상태
  const [soundPage1, setSoundPage1] = useState(null); // 첫 번째 페이지 소리 객체
  const [soundPage2, setSoundPage2] = useState(null); // 두 번째 페이지 소리 객체
  const [isSoundLoaded, setIsSoundLoaded] = useState(false); // 소리 로드 상태
  const nextTickTime = useRef(null); // 다음 tick 시간
  const timerRef = useRef(null); // setTimeout 참조
  const animation = useRef(new Animated.Value(1)).current; // 애니메이션 효과
  const accumulatedDrift = useRef(0); // 누적 오차 관리
  const [currentPage, setCurrentPage] = useState(0); // 현재 페이지 관리

  // 소리 로드 함수
  async function loadSounds() {
    try {
      const { sound: sound1 } = await Audio.Sound.createAsync(
        require('./assets/metronome-tick-302ms.wav') // 첫 번째 페이지 메트로놈 소리 파일 추가
      );
      const { sound: sound2 } = await Audio.Sound.createAsync(
        require('./assets/metronome-tick-300ms.wav') // 두 번째 페이지 메트로놈 소리 파일 추가
      );
      await sound1.setStatusAsync({ shouldPlay: false }); // 준비 상태로 유지
      await sound2.setStatusAsync({ shouldPlay: false }); // 준비 상태로 유지
      setSoundPage1(sound1);
      setSoundPage2(sound2);
      setIsSoundLoaded(true); // 소리 로드 완료 표시
    } catch (error) {
      console.error("Error loading sounds: ", error);
    }
  }

  // 초기화 시 소리 로드
  useEffect(() => {
    loadSounds();
    return () => {
      if (soundPage1) {
        soundPage1.unloadAsync();
      }
      if (soundPage2) {
        soundPage2.unloadAsync();
      }
    };
  }, []);

  // 메트로놈 소리 재생 함수
  const playSound = async () => {
    let currentSound = currentPage === 0 ? soundPage1 : soundPage2;
    if (currentSound && isSoundLoaded) {
      try {
        await currentSound.stopAsync(); // 재생 중지 후
        await currentSound.setPositionAsync(0); // 소리를 처음부터 재생하도록 위치 설정
        await currentSound.playAsync(); // 재생 시작
      } catch (error) {
        console.error("Error playing sound: ", error);
      }
    }
  };

  // 비주얼 피드백 애니메이션 함수
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

  // Tick 스케줄링 함수: 정확한 간격 유지
  const scheduleTick = () => {
    const now = performance.now();
    const interval = (60 / bpm) * 1000;

    if (nextTickTime.current <= now) {
      playSound();
      startAnimation();
      const drift = now - nextTickTime.current; // 현재 오차 계산
      accumulatedDrift.current += drift; // 오차 누적
      nextTickTime.current += interval;
    }

    const correctedInterval = interval - accumulatedDrift.current; // 누적 오차를 보정한 간격 계산
    const timeUntilNextTick = Math.max(0, nextTickTime.current - performance.now());
    timerRef.current = setTimeout(scheduleTick, Math.min(timeUntilNextTick, correctedInterval));
    accumulatedDrift.current = 0; // 오차 보정 후 초기화
  };

  // 프리셋 버튼 클릭 시 BPM 설정 및 메트로놈 시작/중지
  const handlePresetClick = (presetBpm) => {
    if (!isSoundLoaded) {
      console.warn("Sounds are not loaded yet.");
      return;
    }
    if (isPlaying) {
      // 재생 중이라면 멈춤
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setIsPlaying(false);
    } else {
      // 재생 중이 아니라면 새로운 BPM으로 시작
      setBpm(presetBpm);
      nextTickTime.current = performance.now();
      accumulatedDrift.current = 0;
      scheduleTick();
      setIsPlaying(true);
    }
  };

  // BPM이 변경될 때 즉시 새로운 스케줄 설정
  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      nextTickTime.current = performance.now();
      accumulatedDrift.current = 0;
      scheduleTick();
    }
  }, [bpm]);

  const handleAnyButtonClick = () => {
    if (isPlaying) {
      // 재생 중일 때 아무 버튼을 누르면 멈춤
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setIsPlaying(false);
    }
  };

  // 페이지 스크롤 시 현재 페이지 설정
  const handleScroll = (event) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(pageIndex);
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
      {/* Home Screen Page 1 */}
      <View style={[styles.container, styles.containerPage1]}>
        <Animated.View style={[styles.visualFeedback, { transform: [{ scale: animation }] }]} />
        <Text style={styles.title}>Metronome</Text>
        <Text style={styles.subtitle}>for Chromatic</Text>
        <Text style={styles.bpmText}>BPM: {bpm}</Text>
        <View style={styles.presetContainer}>
          <TouchableOpacity style={styles.presetButton} onPress={() => { handlePresetClick(60); handleAnyButtonClick(); }}>
            <Text style={styles.presetButtonText}>60</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => { handlePresetClick(90); handleAnyButtonClick(); }}>
            <Text style={styles.presetButtonText}>90</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home Screen Page 2 */}
      <View style={[styles.container, styles.containerPage2]}>
        <Animated.View style={[styles.visualFeedback, { transform: [{ scale: animation }] }]} />
        <Text style={styles.title}>Metronome</Text>
        <Text style={styles.subtitle}>for Chromatic (clock)</Text>
        <Text style={styles.bpmText}>BPM: {bpm}</Text>
        <View style={styles.presetContainer}>
          <TouchableOpacity style={styles.presetButton} onPress={() => { handlePresetClick(60); handleAnyButtonClick(); }}>
            <Text style={styles.presetButtonText}>60</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => { handlePresetClick(90); handleAnyButtonClick(); }}>
            <Text style={styles.presetButtonText}>90</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1,
  },
  container: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    fontWeight: 'thin',
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
    width: '80%',
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
    position: 'absolute',
    width: 300,
    height: 300,
    backgroundColor: '#F2E4D8',
    borderRadius: 70,
  },
});