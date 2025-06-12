"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Webcam from "react-webcam";
import useSpeechToText from "react-hook-speech-to-text";
import { Mic, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
  const [userAnswer, setUserAnswer] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults,
  } = useSpeechToText({
    continuous: false,
    useLegacyResults: false,
  });

  // Append recognized speech to answer
  useEffect(() => {
    if (results?.length) {
      console.log("🎤 Recognized speech:", results);
      results.forEach((r) => {
        setUserAnswer((prev) => prev + " " + r.transcript);
      });
    }
  }, [results]);

  useEffect(() => {
    console.log("📝 userAnswer updated:", userAnswer);
    if (!isRecording && userAnswer?.length > 10) {
      UpdateUserAnswer();
    }
  }, [userAnswer]);

  const StartStopRecording = async () => {
    console.log("Mic clicked! isRecording:", isRecording);
    if (isRecording) {
      console.log("Stopping...");
      stopSpeechToText();
    } else {
      console.log("Starting...");
      setUserAnswer("");
      setResults([]);
      startSpeechToText();
    }
  };

  const UpdateUserAnswer = async () => {
    console.log("Sending to Gemini:", userAnswer);
    setLoading(true);

    const feedbackPrompt = `
      Question: ${mockInterviewQuestion[activeQuestionIndex]?.question}
      User Answer: ${userAnswer}
      Based on the question and user's answer, return only valid JSON inside triple backticks like:
      \`\`\`json
      {
        "rating": 4,
        "feedback": "You're on the right track. Add more depth about Node.js's event loop and provide a specific example."
      }
      \`\`\`
    `;

    try {
      const result = await chatSession.sendMessage(feedbackPrompt);
      const rawText = await result.response.text();
      console.log("📦 Raw Gemini Output:", rawText);

      // Extract JSON from code block
      const match = rawText.match(/```json([\s\S]*?)```/);
      const jsonOnly = match ? match[1].trim() : rawText.trim();

      let JsonFeedbackResp;
      try {
        JsonFeedbackResp = JSON.parse(jsonOnly);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON from Gemini:", parseError);
        throw new Error("Invalid JSON format received from Gemini.");
      }

      console.log("✅ Parsed Feedback:", JsonFeedbackResp);

      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.question,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
        userAns: userAnswer,
        feedback: JsonFeedbackResp?.feedback,
        rating: JsonFeedbackResp?.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date().toISOString(),
      });

      if (resp) {
        toast("✅ User Answer recorded successfully");
        setUserAnswer("");
        setResults([]);
      }
    } catch (err) {
      console.error("❌ Error in feedback generation or DB insert:", err);
      toast("❌ Failed to process feedback");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center flex-col">
      <div className="flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5 relative">
        <Image
          src={"/webcam.png"}
          width={200}
          height={200}
          className="absolute"
          alt="overlay"
        />
        <Webcam
          mirrored={true}
          style={{
            height: 500,
            width: 500,
            zIndex: 10,
          }}
        />
      </div>

      <Button
        disabled={loading}
        variant="outline"
        className="my-10"
        onClick={StartStopRecording}
      >
        {isRecording ? (
          <h2 className="text-red-600 animate-pulse flex gap-2 items-center">
            <StopCircle />
            Stop Recording
          </h2>
        ) : (
          <h2 className="text-primary flex gap-2 items-center">
            <Mic />
            Record Answer
          </h2>
        )}
      </Button>

      {userAnswer && (
        <div className="p-5 w-full max-w-2xl text-sm text-muted-foreground">
          <strong>Your Answer:</strong>
          <p>{userAnswer}</p>
        </div>
      )}
    </div>
  );
}

export default RecordAnswerSection;
