"use client";
import { createWtwApi } from "@wtw/core";

export { ApiError, type RoomError } from "@wtw/core";

/** Same origin: under the microfrontends group /match/api/* is this app. */
export const api = createWtwApi("");
