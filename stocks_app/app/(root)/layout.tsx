import Header from "@/components/Header/Header";
import React from "react";

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen text-gray-400">
      <Header/>
      <div className="container py-10">{props.children}</div>
    </main>
  );
}
