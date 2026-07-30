"use client";
import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { useOfficeData } from "./useOfficeData";

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const { profile } = useAuth();
  const officeData = useOfficeData(profile);
  return <DataCtx.Provider value={officeData}>{children}</DataCtx.Provider>;
}

export const useData = () => useContext(DataCtx);
