
import { z } from "zod";
import * as SecureStore from "expo-secure-store";

import apiClient, { invalidateCache } from "./apiClient";
import { validate, ValidationError } from "../utils/validation";

export type CompteGenderKey = "noAnswer" | "female" | "male" | "other";

export interface CompteProfile {
  id: string | null;
  username: string;
  email: string;
  role: string;
  bio: string;
  gender: CompteGenderKey;
  birthDate: string;
  webhookUrl: string;
  avatarUrl: string | null;
}

export interface UpdateCompteProfileInput {
  id?: string;
  username: string;
  email?: string;
  role?: string;
  bio?: string;
  gender?: CompteGenderKey;
  birthDate?: string;
  webhookUrl?: string;
  avatarUrl?: string | null;
}

export interface UpdateComptePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface UploadCompteAvatarInput {
  uri: string;
  filename?: string;
  mimeType?: string;
}

const PROFILE_ROUTE = process.env.EXPO_PUBLIC_ACCOUNT_PROFILE_ROUTE || "/auths/";
const PROFILE_UPDATE_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_PROFILE_UPDATE_ROUTE || "/auths/update/profile";
const SETTINGS_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_SETTINGS_ROUTE || "/users/user/settings";
const SETTINGS_UPDATE_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_SETTINGS_UPDATE_ROUTE || "/users/user/settings/update";
const PASSWORD_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_PASSWORD_ROUTE || "/auths/update/password";
const AVATAR_ROUTE = process.env.EXPO_PUBLIC_ACCOUNT_AVATAR_ROUTE || "/users/me/avatar";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://pleiade.mi.parisdescartes.fr/api/v1";

const profileSchema = z.object({
  username: z.string().trim().min(1, "nameRequired"),
  bio: z.string().optional().default(""),
  gender: z.enum(["noAnswer", "female", "male", "other"]).optional().default("noAnswer"),
  birthDate: z.string().optional().default(""),
  webhookUrl: z.string().optional().default(""),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "accountPasswordFillAll"),
    newPassword: z.string().min(1, "accountPasswordFillAll"),
    confirmPassword: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.confirmPassword !== undefined && value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "accountPasswordMismatch",
      });
    }
  });

function extractData<T = any>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

function normalizeGender(value: unknown): CompteGenderKey {
  switch (value) {
    case "female":
    case "F":
      return "female";
    case "male":
    case "M":
      return "male";
    case "other":
      return "other";
    case "prefer_not_to_say":
    case "preferNotToSay":
    case "no_answer":
    case "noAnswer":
    default:
      return "noAnswer";
  }
}

function toApiGender(value: CompteGenderKey): string | null {
  switch (value) {
    case "female":
      return "female";
    case "male":
      return "male";
    case "other":
      return "other";
    default:
      return null;
  }
}

function normalizeProfile(payload: any): CompteProfile {
  const data = extractData(payload) ?? {};

  return {
    id: data.id || null,
    username: data.username || data.name || data.full_name || "",
    email: data.email || "",
    role: data.role || "user",
    bio: data.bio || "",
    gender: normalizeGender(data.gender),
    birthDate: data.birthDate || data.birth_date || data.date_of_birth || "",
    webhookUrl: data.webhookUrl || data.webhook_url || data.webhook || "",
    avatarUrl: data.avatarUrl || data.avatar_url || data.profile_image_url || null,
  };
}

function extractWebhookUrl(payload: any): string {
  const data = extractData(payload) ?? {};

  return (
    data?.ui?.notifications?.webhook_url ||
    data?.notifications?.webhook_url ||
    data?.webhook_url ||
    ""
  );
}

function buildSettingsPayload(payload: any, webhookUrl: string) {
  const data = extractData(payload) ?? {};
  const ui =
    data.ui && typeof data.ui === "object" && !Array.isArray(data.ui) ? data.ui : {};
  const notifications =
    ui.notifications &&
    typeof ui.notifications === "object" &&
    !Array.isArray(ui.notifications)
      ? ui.notifications
      : {};

  return {
    ...data,
    ui: {
      ...ui,
      params: ui.params ?? {},
      memory: ui.memory ?? false,
      notifications: {
        ...notifications,
        webhook_url: webhookUrl.trim() || null,
      },
    },
  };
}

function buildUrl(baseUrl: string, route: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return `${normalizedBase}${normalizedRoute}`;
}

async function fetchProfileWithSettings(): Promise<CompteProfile> {
  const [profileResult, settingsResult] = await Promise.allSettled([
    apiClient.get(PROFILE_ROUTE, { headers: { "x-no-cache": "1" } }),
    apiClient.get(SETTINGS_ROUTE, { headers: { "x-no-cache": "1" } }),
  ]);

  if (profileResult.status !== "fulfilled") {
    throw profileResult.reason;
  }

  const profile = normalizeProfile(profileResult.value.data);

  if (settingsResult.status === "fulfilled") {
    profile.webhookUrl = extractWebhookUrl(settingsResult.value.data);
  }

  return profile;
}

export const compteService = {
  getProfile: async (): Promise<CompteProfile> => {
    return fetchProfileWithSettings();
  },

  updateProfile: async (input: UpdateCompteProfileInput): Promise<CompteProfile> => {
    const validation = validate(profileSchema, {
      username: input.username?.trim(),
      bio: input.bio ?? "",
      gender: input.gender ?? "noAnswer",
      birthDate: input.birthDate ?? "",
      webhookUrl: input.webhookUrl ?? "",
    });

    if (!validation.success) {
      const [field, message] = Object.entries(validation.errors!)[0]!;
      throw new ValidationError(message, field);
    }

    const payload: Record<string, unknown> = {
      ...(input.id ? { id: input.id } : {}),
      name: validation.data!.username,
      ...(input.role ? { role: input.role } : {}),
      ...(input.email?.trim() ? { email: input.email.trim() } : {}),
      ...(input.avatarUrl !== undefined ? { profile_image_url: input.avatarUrl } : {}),
      bio: validation.data!.bio.trim() || null,
      gender: toApiGender(validation.data!.gender),
      date_of_birth: validation.data!.birthDate.trim() || null,
    };

    invalidateCache(PROFILE_ROUTE);
    invalidateCache(SETTINGS_ROUTE);

    await apiClient.post(PROFILE_UPDATE_ROUTE, payload);

    const settingsResponse = await apiClient.get(SETTINGS_ROUTE, {
      headers: { "x-no-cache": "1" },
    });
    const settingsPayload = buildSettingsPayload(settingsResponse.data, validation.data!.webhookUrl);
    await apiClient.post(SETTINGS_UPDATE_ROUTE, settingsPayload);

    invalidateCache(PROFILE_ROUTE);
    invalidateCache(SETTINGS_ROUTE);

    return fetchProfileWithSettings();
  },

  updatePassword: async (input: UpdateComptePasswordInput): Promise<any> => {
    const validation = validate(passwordSchema, input);

    if (!validation.success) {
      const [field, message] = Object.entries(validation.errors!)[0]!;
      throw new ValidationError(message, field);
    }

    try {
      const response = await apiClient.post(PASSWORD_ROUTE, {
        password: validation.data!.currentPassword,
        new_password: validation.data!.newPassword,
      });

      return extractData(response.data);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;

      if (typeof detail === "string" && detail.trim()) {
        throw new Error(detail);
      }

      throw error;
    }
  },

  uploadAvatar: async (input: UploadCompteAvatarInput): Promise<CompteProfile> => {
    const token = await SecureStore.getItemAsync("token");

    if (!token) {
      throw new Error("Missing authentication token");
    }

    const formData = new FormData();
    formData.append("file", {
      uri: input.uri,
      type: input.mimeType || "image/jpeg",
      name: input.filename || "avatar.jpg",
    } as any);

    const response = await fetch(buildUrl(BASE_URL, AVATAR_ROUTE), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Avatar upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return normalizeProfile(data);
  },
};
