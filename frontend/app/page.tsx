"use client";

import { useEffect, useState } from "react";

type Payment = {
  payment_id: string;
  customer_id: string;
  amount: number;
  failure_reason: string | null;
  status: string;
  recovered_amount: number;
};

type DashboardData = {
  total_payments: number;
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  payments_recovered: number;
  payments_scheduled: number;
  payments_blocked: number;
  recent_payments: Payment[];
};

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatReason(reason: string | null) {
  if (!reason) return "Unknown";

  return reason
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const style =
    normalized === "recovered"
      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-400"
      : normalized === "scheduled"
        ? "border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
        : "border-white/[0.08] bg-white/[0.04] text-zinc-400";

  const dot =
    normalized === "recovered"
      ? "bg-emerald-400"
      : normalized === "scheduled"
        ? "bg-amber-300"
        : "bg-zinc-500";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium capitalize ${style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function RecoveryRing({ value }: { value: number }) {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className="relative h-36 w-36 rounded-full"
      style={{
        background: `conic-gradient(
          #34d399 ${percentage * 3.6}deg,
          #1b1d1f ${percentage * 3.6}deg
        )`,
      }}
    >
      <div className="absolute inset-[9px] rounded-full bg-[#0c0e0f] flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight">
          {percentage.toFixed(0)}%
        </span>

        <span className="mt-1 text-[9px] tracking-[0.18em] text-zinc-600">
          RECOVERED
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/dashboard",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const result = await response.json();

        setData(result);

        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch (error) {
        console.error("Could not connect to RecoverAI backend", error);
      }
    };

    loadDashboard();

    const interval = window.setInterval(loadDashboard, 5000);

    return () => window.clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#070809] text-white flex items-center justify-center">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0c0e0f] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-sm text-zinc-400">
              Connecting to RecoverAI...
            </span>
          </div>
        </div>
      </main>
    );
  }

  const recoveryRate = Math.min(
    Math.max(data.recovery_rate, 0),
    100
  );

  const recoveredCount = data.payments_recovered;
  const scheduledCount = data.payments_scheduled;
  
  return (
    <main className="min-h-screen bg-[#070809] text-white">

      {/* Lightweight static background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />

      {/* TOP BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] border-b border-white/[0.07] bg-[#070809]">

        <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-6 lg:px-8">

          {/* Brand */}
          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-black text-black">
              R
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight">
                RecoverAI
              </p>

              <p className="mt-0.5 text-[8px] tracking-[0.25em] text-zinc-600">
                REVENUE INTELLIGENCE
              </p>
            </div>

          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">

            <button className="rounded-lg border border-white/[0.06] bg-white/[0.05] px-4 py-2 text-[11px] font-medium">
              Overview
            </button>

            <button className="px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-200">
              Payments
            </button>

            <button className="px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-200">
              Agent
            </button>

            <button className="px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-200">
              Audit
            </button>

          </nav>

          {/* Online */}
          <div className="flex items-center gap-4">

            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[10px] text-zinc-500">
                Agent online
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-[9px] text-zinc-500">
              AI
            </div>

          </div>

        </div>

      </header>


      {/* PAGE */}
      <div className="relative mx-auto max-w-[1500px] px-6 pb-10 pt-[105px] lg:px-8">

        {/* HERO */}
        <section className="mb-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">

          <div>

            <div className="mb-3 flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[9px] font-medium tracking-[0.25em] text-emerald-400">
                AUTONOMOUS RECOVERY ENGINE
              </span>

            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.035em] lg:text-[38px]">
              Recovery Command Center
            </h1>

            <p className="mt-3 max-w-[620px] text-sm leading-6 text-zinc-500">
              RecoverAI detects payment failures, evaluates recovery paths,
              and executes safe recovery actions automatically.
            </p>

          </div>


          <div className="flex items-center gap-3">

            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

            <div>
              <p className="text-[8px] tracking-[0.18em] text-zinc-700">
                LIVE SYSTEM
              </p>

              <p className="mt-1 text-[10px] text-zinc-500">
                Synced {lastUpdated || "now"} · refresh 5s
              </p>
            </div>

          </div>

        </section>


        {/* HERO DASHBOARD */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* LARGE REVENUE CARD */}
          <div className="relative overflow-hidden rounded-[22px] border border-emerald-400/[0.12] bg-[#0b100e] p-7 lg:col-span-7">

            <div className="absolute left-0 top-0 h-full w-[3px] bg-emerald-400/70" />

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs text-zinc-500">
                  Revenue recovered
                </p>

                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] lg:text-5xl">
                  {formatMoney(data.revenue_recovered)}
                </h2>

              </div>


              <div className="text-right">

                <p className="text-[9px] tracking-widest text-zinc-600">
                  RECOVERY RATE
                </p>

                <p className="mt-2 text-2xl font-medium text-emerald-400">
                  {recoveryRate.toFixed(0)}%
                </p>

              </div>

            </div>


            {/* Visual recovery graph */}
            <div className="mt-9">

              <div className="flex h-[92px] items-end gap-[5px]">

                {[
                  24, 34, 30, 45, 39, 52, 47, 61,
                  55, 69, 64, 77, 71, 83, 78, 91,
                  86, 100,
                ].map((height, index) => (

                  <div
                    key={index}
                    className="flex-1 rounded-t-[3px] border-t border-emerald-300/10 bg-emerald-400/[0.17]"
                    style={{
                      height: `${height}%`,
                    }}
                  />

                ))}

              </div>

              <div className="mt-3 flex justify-between">

                <span className="text-[8px] tracking-widest text-zinc-700">
                  RECOVERY ACTIVITY
                </span>

                <span className="text-[8px] tracking-widest text-emerald-500/70">
                  LIVE
                </span>

              </div>

            </div>

          </div>


          {/* RECOVERY RING */}
          <div className="rounded-[22px] border border-white/[0.08] bg-[#0c0e0f] p-7 lg:col-span-5">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs text-zinc-500">
                  Recovery performance
                </p>

                <p className="mt-1 text-[10px] text-zinc-700">
                  Autonomous recovery efficiency
                </p>

              </div>

              <span className="text-[9px] text-zinc-700">
                01
              </span>

            </div>


            <div className="flex justify-center py-6">

              <RecoveryRing value={recoveryRate} />

            </div>


            <div className="grid grid-cols-2 border-t border-white/[0.06] pt-5">

              <div>

                <p className="text-[9px] tracking-wider text-zinc-700">
                  AT RISK
                </p>

                <p className="mt-2 text-sm font-medium">
                  {formatMoney(data.revenue_at_risk)}
                </p>

              </div>


              <div className="text-right">

                <p className="text-[9px] tracking-wider text-zinc-700">
                  PAYMENTS
                </p>

                <p className="mt-2 text-sm font-medium">
                  {data.total_payments}
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* AI PIPELINE */}
        <section className="mb-4 rounded-[20px] border border-white/[0.08] bg-[#0c0e0f] px-5 py-4">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

            <div className="flex items-center gap-4">

              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07]">

                <span className="text-lg text-emerald-400">
                  ✦
                </span>

                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0c0e0f] bg-emerald-400" />

              </div>

              <div>

                <div className="flex items-center gap-2">

                  <p className="text-sm font-medium">
                    Recovery Agent
                  </p>

                  <span className="rounded-full bg-emerald-400/[0.07] px-2 py-0.5 text-[8px] text-emerald-400">
                    ACTIVE
                  </span>

                </div>

                <p className="mt-1 text-[10px] text-zinc-600">
                  AI recovery workflow ready for failed payments
                </p>

              </div>

            </div>


            {/* Pipeline */}
            <div className="flex items-center gap-2">

              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-4 py-2">
                <span className="text-[9px] tracking-wider text-zinc-500">
                  01 ANALYZE
                </span>
              </div>

              <span className="text-zinc-700">
                →
              </span>

              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-4 py-2">
                <span className="text-[9px] tracking-wider text-zinc-500">
                  02 DECIDE
                </span>
              </div>

              <span className="text-zinc-700">
                →
              </span>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2">
                <span className="text-[9px] tracking-wider text-emerald-400">
                  03 RECOVER
                </span>
              </div>

            </div>

          </div>

        </section>


        {/* LOWER DASHBOARD */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ACTIVITY STREAM */}
          <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0c0e0f] lg:col-span-8">

            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">

              <div>

                <div className="flex items-center gap-3">

                  <h2 className="text-sm font-medium">
                    Recovery activity
                  </h2>

                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[8px] text-zinc-600">
                    {data.recent_payments.length} EVENTS
                  </span>

                </div>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Latest autonomous payment decisions
                </p>

              </div>


              <div className="flex items-center gap-2">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-[8px] tracking-wider text-zinc-600">
                  LIVE
                </span>

              </div>

            </div>


            {/* Column labels */}
            <div className="hidden grid-cols-12 border-b border-white/[0.04] px-6 py-3 text-[8px] tracking-wider text-zinc-700 sm:grid">

              <div className="col-span-4">
                PAYMENT
              </div>

              <div className="col-span-2">
                AMOUNT
              </div>

              <div className="col-span-3">
                FAILURE
              </div>

              <div className="col-span-3 text-right">
                OUTCOME
              </div>

            </div>


            {data.recent_payments.length === 0 ? (

              <div className="flex min-h-[220px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-600">
                    ◇
                  </div>

                  <p className="mt-4 text-sm text-zinc-500">
                    Waiting for payment events
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-700">
                    New recovery activity will appear here.
                  </p>

                </div>

              </div>

            ) : (

              <div>

                {data.recent_payments.map((payment, index) => (

                  <div
                    key={payment.payment_id}
                    className="grid grid-cols-1 gap-4 border-b border-white/[0.045] px-6 py-4 last:border-0 sm:grid-cols-12 sm:items-center"
                  >

                    {/* Payment */}
                    <div className="sm:col-span-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[9px] text-zinc-600">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div>

                          <p className="text-xs font-medium">
                            {payment.payment_id}
                          </p>

                          <p className="mt-1 text-[9px] text-zinc-700">
                            {payment.customer_id}
                          </p>

                        </div>

                      </div>

                    </div>


                    {/* Amount */}
                    <div className="sm:col-span-2">

                      <p className="text-xs">
                        {formatMoney(payment.amount)}
                      </p>

                    </div>


                    {/* Failure */}
                    <div className="sm:col-span-3">

                      <p className="text-[10px] text-zinc-500">
                        {formatReason(payment.failure_reason)}
                      </p>

                    </div>


                    {/* Outcome */}
                    <div className="sm:col-span-3 sm:text-right">

                      <StatusBadge status={payment.status} />

                      {payment.recovered_amount > 0 && (

                        <p className="mt-2 text-[9px] text-emerald-400">
                          +{formatMoney(payment.recovered_amount)}
                        </p>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>


          {/* AGENT INTELLIGENCE */}
          <div className="rounded-[20px] border border-white/[0.08] bg-[#0c0e0f] p-6 lg:col-span-4">

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-sm font-medium">
                  Agent intelligence
                </h2>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Current recovery state
                </p>

              </div>

              <span className="text-emerald-400">
                ✦
              </span>

            </div>



            {/* Mini stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">

                <p className="text-[9px] text-zinc-600">
                  RECOVERED
                </p>

                <p className="mt-2 text-xl font-medium">
                  {recoveredCount}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">

                <p className="text-[9px] text-zinc-600">
                  SCHEDULED
                </p>

                <p className="mt-2 text-xl font-medium">
                  {scheduledCount}
                </p>

              </div>


          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
  <p className="text-[9px] text-zinc-600">
    BLOCKED
  </p>

  <p className="mt-2 text-xl font-medium">
    {data.payments_blocked}
  </p>
</div>

</div>

            {/* Efficiency */}
            <div className="mt-6">

              <div className="mb-2 flex justify-between">

                <span className="text-[10px] text-zinc-500">
                  Recovery efficiency
                </span>

                <span className="text-[10px]">
                  {recoveryRate.toFixed(0)}%
                </span>

              </div>

              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">

                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${recoveryRate}%`,
                  }}
                />

              </div>

            </div>


            {/* Money */}
            <div className="mt-6 border-t border-white/[0.06] pt-6">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-[9px] tracking-wider text-zinc-700">
                    CAPITAL RECOVERED
                  </p>

                  <p className="mt-2 text-xl font-medium text-emerald-400">
                    {formatMoney(data.revenue_recovered)}
                  </p>

                </div>

                <span className="text-xs text-emerald-400">
                  ↗
                </span>

              </div>

            </div>


            {/* System state */}
            <div className="mt-6 border-t border-white/[0.06] pt-6">

              <p className="text-[9px] tracking-[0.15em] text-zinc-700">
                SYSTEM STATE
              </p>

              <div className="mt-4 flex items-center gap-3">

                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                <p className="text-xs font-medium">
                  Autonomous mode active
                </p>

              </div>

              <p className="mt-3 text-[10px] leading-5 text-zinc-600">
                RecoverAI is ready to analyze failures and execute approved
                recovery strategies.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}