import Image from "next/image";
import Link from "next/link";
import NavItems from "../NavItems/NavItems";
import UserDropdown from "../Dropdown/UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";

export default async function Header({user}: { user: User}) {
  const initialStocks = await searchStocks();
  return (
    <header className="sticky top-0 header">
      <div className="container header-wrapper">
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="Signalist logo"
            width={140}
            height={32}
            className="h-8 w-auto cursor-pointer"
          />
        </Link>
        <nav className="hidden sm:block">
            <NavItems initialStocks={initialStocks} />
        </nav>
        <UserDropdown user={user} initialStocks={initialStocks} />
      </div>
    </header>
  );
}
