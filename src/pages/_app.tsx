import { type AppType } from "next/app";
import { Inter } from "next/font/google";

import { api } from "~/utils/api";

import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});
const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className="flex min-h-screen justify-center overflow-x-hidden">
      <main className={`w-full max-w-7xl p-4 font-sans ${inter.variable}`}>
        <Component {...pageProps} />
      </main>
    </div>
  );
};

export default api.withTRPC(MyApp);
