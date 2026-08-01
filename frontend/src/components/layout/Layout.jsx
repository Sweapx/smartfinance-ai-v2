import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
