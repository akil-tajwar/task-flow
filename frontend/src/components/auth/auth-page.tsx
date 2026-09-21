"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const features = [
  "Multi-tenant — one platform, unlimited workspaces",
  "Boards, lists & Gantt views for every project",
  "Task assignments, due dates & dependencies",
  "Role-based access control",
  "Real-time progress & workload reports",
];

export function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gray-950 px-16 py-14">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-white" />
            <span className="text-lg font-bold text-white tracking-tight">
              TaskFlow
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-snug">
            Plan, track, and ship
            <br />
            work together.
          </h1>
          <p className="mt-4 text-gray-400 text-base leading-relaxed">
            A multi-tenant task management platform built for modern teams.
          </p>

          <ul className="mt-10 space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                  <svg
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    viewBox="0 0 10 8"
                  >
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm text-gray-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} TaskFlow. All rights reserved.
        </p>
      </div>

      {/* ── Right auth panel ── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="h-6 w-6 rounded bg-gray-900" />
            <span className="text-lg font-bold text-gray-900">TaskFlow</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-4 text-sm font-medium transition-colors ${
                    tab === t
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Form body */}
            <div className="p-8">
              {tab === "login" ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Welcome back
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Sign in to your account to continue.
                    </p>
                  </div>
                  <LoginForm />
                  <p className="mt-6 text-center text-sm text-gray-500">
                    No account?{" "}
                    <button
                      onClick={() => setTab("register")}
                      className="font-medium text-gray-900 underline underline-offset-2"
                    >
                      Create one free
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Create your account
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Set up your workspace in under a minute.
                    </p>
                  </div>
                  <RegisterForm />
                  <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <button
                      onClick={() => setTab("login")}
                      className="font-medium text-gray-900 underline underline-offset-2"
                    >
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
