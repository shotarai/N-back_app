import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator, 
} from "react-native";
import { type StackParamList } from "../App";
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useLanguage } from '../contexts/LanguageContext';
import AnswerButton from "../components/AnswerButton";
import { useCheckContext } from '../contexts/CheckContext';
import { useRadioContext } from '../contexts/RadioContext';

interface PlayScreenProps {
  currentTime: string;
}

const PlayScreen: React.FC<PlayScreenProps> = ({ currentTime }) => {
  const [checkBool, setCheckBool] = useState(true);
  const [canResume, setCanResume] = useState(true);
  const [endUp, setEndUp] = useState(true);
  const [timeList, setTimeList] = useState<number[]>([]);
  const [displayLetters, setDisplayLetters] = useState<string[]>([]);
  const [answerLetters, setAnswerLetters] = useState<string[]>([]);
  const [correctList, setCorrectList] = useState<number[]>([]);
  const [letterList, setLetterList] = useState<string[]>(["", "", ""]);
  const [randomLetter, setRandomLetter] = useState("");
  const [displayCount, setDisplayCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { language } = useLanguage();
  const { isCheckedBool } = useCheckContext();
  const { sleepAnswer } = useRadioContext();
  const n = 3;
  const all_questions = 20;
  // const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const alphabet = "ABCDEFGHI";

  type homeScreenProp = StackNavigationProp<StackParamList>;
  const [endBool, setEndbool] = useState<boolean>(true);


  const RandomAlphabet = () => {
    if (!checkBool || displayCount === all_questions + n + 1) {
      return;
    }
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    setRandomLetter(alphabet[randomIndex]);
    setLetterList((prevList) => {
      const updatedList = [...prevList, randomLetter].slice(-(n+1));
      return updatedList;
    });
    setDisplayLetters((prevList) => [...prevList, randomLetter]);
    setDisplayCount(displayCount + 1);
    if (displayCount <= n) {
      setTimeout(() => {
        setRandomLetter("");
      }, 1500);
    }
    if (displayCount >= n + 1) {
      setCheckBool(false);
      setCanResume(false);
      setStartTime(performance.now());
    }
  };

  const CheckAnswer = (str: string) => {
    const endTime = performance.now();
    const timeDifference = (endTime - startTime) / 1000;
    if (letterList[0] === str) {
      setCorrectCount(correctCount + 1);
      setCorrectList((prevList) => [...prevList, 1])
    }else{
      setCorrectList((prevList) => [...prevList, 0])
    }
    setAnswerLetters((prevList) => [...prevList, str]);
    setCheckBool(true);
    setCanResume(true);
    setTimeList((prevList) => [...prevList, timeDifference]);
  };

  useEffect(() => {
    if (displayCount <= n + 1) {
      const intervalIdBefore = setInterval(() => {
        RandomAlphabet();
      }, 2000);

      return () => {
        clearInterval(intervalIdBefore);
      };
    } else {
      const intervalIdAfter = setInterval(() => {
        RandomAlphabet();
      }, 1500);

      return () => {
        clearInterval(intervalIdAfter);
      };
    }
  }, [displayCount, canResume]);

  useEffect(() => {
    //最初に表示させる4個のアルファベットを除外して20問解かせるため
    if (displayCount === all_questions + n + 1) {
      setEndUp(false);
    }
  }, [timeList]);

  const SendData = async () => {
    setEndbool(false);
    const newData = {
      checkbox: {
        ルールを遵守: isCheckedBool ? "ルールを厳守している" : "ルールを破ってしまった",
      },
      question: {
        解答: sleepAnswer,
      },
      nback: {
        正解数: correctCount,
        解答数: displayCount - n - 1,
        表示アルファベット: displayLetters.slice(1, 21),
        解答アルファベット: answerLetters,
        正答遷移: correctList,
        解答時間: timeList,
      },
    };
    const currentUserEmail = auth.currentUser?.email
      ? auth.currentUser.email
      : "";
    const dataRef = doc(db, "2025", currentUserEmail);
    const maxRetries = 3;
    let attempts = 0;
    let success = false;
  
    while (attempts < maxRetries && !success) {
      try {
        await setDoc(dataRef, { [currentTime]: newData }, { merge: true });
        success = true;
      } catch (error) {
        attempts += 1;
        if (attempts >= maxRetries) {
          console.error("Failed to save answer after multiple attempts:", error);
        } else {
          console.log(`Retrying to save answer... (Attempt ${attempts})`);
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      {endBool ? (
        endUp ? (
          checkBool ? (
            <View style={styles.container}>
              <Text style={[styles.randomLetter, { marginTop: -80 }]}>
                {randomLetter}
              </Text>
            </View>
          ) : (
            <View style={styles.container}>
              <Text style={styles.text}>{language === 'ja'? `${n}つ前のアルファベットは？`: `What is the ${n}th previous letter of the alphabet?`}</Text>
              <Text style={[styles.text, { marginTop: 10 }]}>{displayCount - n - 1}/{all_questions}</Text>
              <View style={styles.buttonContainer}>
                <View style={styles.row}>
                  {['A', 'B', 'C'].map((label) => (
                    <AnswerButton key={label} label={label} onPress={() => CheckAnswer(label)} />
                  ))}
                </View>
                <View style={styles.row}>
                  {['D', 'E', 'F'].map((label) => (
                    <AnswerButton key={label} label={label} onPress={() => CheckAnswer(label)} />
                  ))}
                </View>
                <View style={styles.row}>
                  {['G', 'H', 'I'].map((label) => (
                    <AnswerButton key={label} label={label} onPress={() => CheckAnswer(label)} />
                  ))}
                </View>
              </View>
            </View>
          )
        ) : (
          <View style={styles.container}>
            <Text style={styles.text}>{language === 'ja' ? '測定終了' : 'Finish'}</Text>
            {/* <Text style={styles.text}>結果</Text>
            <Text style={styles.text}>
              {correctCount}/{displayCount - n - 1}
            </Text>*/}
            <TouchableOpacity
              style={[styles.button, { marginTop: 50 }]}
              onPress={() => SendData()}
            >
              <Text style={styles.buttonText}>{language === 'ja' ? '送信' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View style={styles.container}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              <Text style={styles.questionText}>{language === 'ja' ? 'データ送信が完了しました' : 'Complete Sending Data'}</Text>
              <Text style={styles.questionText}>{language === 'ja' ? 'アプリを終了してください' : 'Please close the app'}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  questionText: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "blue",
    padding: 20,
    borderRadius: 10,
    width: 150,
  },
  buttonContainer: {
    flexDirection: "column",
    flexWrap: "wrap",
    width: "80%", // ボタンの幅を調整
    height: "80%", // ボタンの高さを調整
    margin: 10, // コンテナ全体の余白を調整
    justifyContent: "center", // 水平方向に中央揃え
  },
  row: {
    flexDirection: "row",
    width: "100%", // 1行全体の幅を調整
  },
  button2: {
    width: 100, // ボタンの幅
    height: 100, // ボタンの高さ
    margin: 8, // ボタン間の余白を調整
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "blue", // ボタンの背景色
    borderRadius: 8, // ボタンの角を丸くする
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    textAlign: "center",
  },
  randomLetter: {
    fontSize: 256,
  },
  text: {
    color: "black",
    fontSize: 24,
    textAlign: "center",
  },
});

export default PlayScreen;
