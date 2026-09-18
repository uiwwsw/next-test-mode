"use client";
import { useEffect, useState } from "react";
export default function Page() {
  const [cart, setCart] = useState(null);
  useEffect(() => {
    fetch("/api/cart")
      .then((response) => response.json())
      .then(setCart);
  }, []);
  return <strong data-csr-total>{cart?.total ?? "Loading"}</strong>;
}
