import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import axios from "axios";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { UfabcProfessor, Comment } from "~/types";

const ufabcNextAPI = axios.create({
  baseURL: "https://api.ufabcnext.com/v1/",
  headers: {
    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MmQxODZkYzE5NTIwNDAwMTdjNzVkZGMiLCJyYSI6MTEyMDIyMzIyMDYsImNvbmZpcm1lZCI6dHJ1ZSwiZW1haWwiOiJhcnRodXIuaGFuQGFsdW5vLnVmYWJjLmVkdS5iciIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxNzEwMjY3NTQzfQ.AK4sehdT3zUxJOAF530STc-dLqwVlN8mL0Gi4FM3c7Q`,
  },
});

const fetchData = async (url: string) => {
  const response = await ufabcNextAPI.get(url);
  return response.data;
};

export const postRouter = createTRPCRouter({
  listProfessors: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input: { name } }) => {
      const professors = await fetchData(`teachers/search?q=${name}`);

      return professors.data as UfabcProfessor[];
    }),

  getSummary: publicProcedure
    .input(
      z.object({
        teacherId: z.string(),
        apiKey: z.string(),
        extraArguments: z.string().optional(),
      }),
    )
    .query(async ({ input: { teacherId, apiKey, extraArguments = "" } }) => {
      const commentsData = await fetchData(
        `comments/${teacherId}?page=0&limit=900`,
      );
      const comments = commentsData.data as Comment[];

      const parsedData = comments
        .map((item) => item.comment)
        .map((comment) => comment.replace(/\n/g, " "));

      const model = createModel(apiKey);

      const prompt = `Faça um resumo das seguintes reviews, ${extraArguments}: ${parsedData}`;
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return text;
    }),
});

function createModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  return model;
}
