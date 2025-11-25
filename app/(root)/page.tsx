// app/(root)/page.tsx
import React from "react";
import { redirect } from "next/navigation";

import HeaderBox from "@/components/HeaderBox";
import RecentTransactions from "@/components/RecentTransactions";
import RightSidebar from "@/components/RightSidebar";
import TotalBalanceBox from "@/components/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";

type SearchParamProps = { searchParams: { id?: string; page?: string } };

const Home = async ({ searchParams }: SearchParamProps) => {
  // --- Access searchParams safely (awaiting resolves Next's "sync dynamic APIs" guard) ---
  // `searchParams` may be a special runtime object; resolving it before property access avoids the warning.
  const sp = await Promise.resolve(searchParams ?? {});
  const currentPage = Number(sp.page as string) || 1;

  // --- Get the logged in user. If no session, redirect to sign-in (server-side) ---
  let loggedIn;
  try {
    loggedIn = await getLoggedInUser();
  } catch (err) {
    // If the helper throws when there's no session, send the user to sign in.
    // You can change this to a fallback UI instead of redirect if you prefer.
    return redirect("/sign-in");
  }

  // Extra guard in case getLoggedInUser returns nullish instead of throwing
  if (!loggedIn || !loggedIn.$id) {
    return redirect("/sign-in");
  }

  // --- Fetch accounts for the current user ---
  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  // If no accounts, render a simple fallback (avoid crashing)
  if (!accounts || !Array.isArray(accounts.data) || accounts.data.length === 0) {
    return (
      <section className="home">
        <div className="home-content">
          <header className="home-header">
            <HeaderBox
              type="greeting"
              title="Welcome"
              user={loggedIn?.firstName || "Guest"}
              subtext="No accounts found. Please add an account to get started."
            />
          </header>
        </div>
        <RightSidebar user={loggedIn} transactions={[]} banks={[]} />
      </section>
    );
  }

  const accountsData = accounts.data;
  const appwriteItemId = (sp.id as string) || accountsData[0]?.appwriteItemId;

  // If we have an appwriteItemId, fetch the account; otherwise `account` will be null
  const account = appwriteItemId ? await getAccount({ appwriteItemId }) : null;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>

        <RecentTransactions
          accounts={accountsData}
          transactions={account?.transactions ?? []}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar
        user={loggedIn}
        transactions={account?.transactions ?? []}
        banks={accountsData?.slice(0, 2) ?? []}
      />
    </section>
  );
};

export default Home;
