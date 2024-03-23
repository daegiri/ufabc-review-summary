import Head from "next/head";
import { type RefObject, useEffect, useRef, useState } from "react";
import { type UfabcProfessor } from "~/types";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

import { api } from "~/utils/api";

export default function Home() {
  const [geminiApiKey, setGeminiApiKey] = useLocalStorage("geminiApiKey", "");

  const [professor, setProfessor] = useState<UfabcProfessor | null>(null);
  const [aiArguments, setAiArguments] = useState<string>("");

  const summaryQuery = api.post.getSummary.useQuery(
    {
      apiKey: geminiApiKey,
      teacherId: professor?._id ?? "",
      extraArguments: aiArguments,
    },
    {
      enabled: !!professor && !!geminiApiKey,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: Infinity,
    },
  );

  return (
    <>
      <Head>
        <title>UFABC Review Summary</title>
      </Head>
      <div className="flex w-full gap-6">
        <div>
          <Image
            src="/assets/ufabc_logo.png"
            alt="UFABC Review Summary"
            width={150}
            height={150}
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col ">
            <input
              placeholder="Insira a API key do Gemini"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              className="w-fit text-blue-500 underline"
            >
              Gere sua chave aqui
            </a>
          </div>
          <Autocomplete setProfessor={setProfessor} />
          <input
            placeholder="Insira mais argumentos para a IA (opcional)"
            value={aiArguments}
            onChange={(e) => setAiArguments(e.target.value)}
          />
        </div>
      </div>
      {professor && (
        <h1 className="my-8 text-xl">
          {professor?.name}
          {aiArguments && `, ${aiArguments}`}
        </h1>
      )}
      {summaryQuery.data && (
        <div>
          <ReactMarkdown>{summaryQuery.data}</ReactMarkdown>
        </div>
      )}
      {summaryQuery.isLoading && <Spinner />}
    </>
  );
}

function Autocomplete({
  setProfessor,
}: {
  setProfessor: (professor: UfabcProfessor) => void;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [professorName, setProfessorName] = useState<string>("");
  const debouncedProfessorName = useDebounce(professorName, 500);

  const ref = useRef(null);
  useClickOutside(ref, () => setIsOpen(false));

  const professors = api.post.listProfessors.useQuery(
    { name: debouncedProfessorName },
    {
      enabled: debouncedProfessorName.length > 0,
    },
  );

  useEffect(() => {
    if (professors.data?.length) {
      setIsOpen(true);
    }
  }, [professors.data]);

  return (
    <div className="relative w-full">
      {isOpen && (
        <ul
          ref={ref}
          className="absolute mt-12 w-full rounded border border-gray-300 bg-white p-2 empty:hidden"
        >
          {professors.data?.map((professor) => (
            <li
              className="cursor-pointer"
              onClick={() => {
                setProfessor(professor);
                setProfessorName("");
                setIsOpen(false);
              }}
              key={professor._id}
            >
              {professor.name}
            </li>
          ))}
          {professors.isLoading && <Spinner />}
        </ul>
      )}
      <input
        className="w-full"
        placeholder="Insira o nome do professor"
        value={professorName}
        onChange={(e) => setProfessorName(e.target.value)}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
): void {
  const handleClick = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [ref, callback]);
}

function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
