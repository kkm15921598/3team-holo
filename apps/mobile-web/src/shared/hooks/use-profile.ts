import { useEffect, useState } from "react";
import { getProfile, subscribeProfile } from "@/shared/stores/profile-store";

export function useProfile() {
  const [profile, setProfile] = useState(getProfile);

  useEffect(() => {
    const unsub = subscribeProfile(() => setProfile(getProfile()));
    return unsub;
  }, []);

  return profile;
}
