import { NotificationState, MessageState, UserState, SessionState, ChannelState } from "@/store/modules";

export interface RootState {
  channels?: ChannelState,
  users?: UserState,
  notifications?: NotificationState,
  session?: SessionState,
  messages?: MessageState
}
