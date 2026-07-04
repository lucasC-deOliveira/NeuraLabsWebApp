// ACL over @/lib/study-api. Only this infra adapter knows the lib boundary.
import { startStudySession, submitCardReview, endStudySession } from "@/lib/study-api";
import type {
  StudySessionPort,
  StudySessionStart,
  CardReviewInput,
} from "../../application/ports/study-session.port";

export class HttpStudySessionAdapter implements StudySessionPort {
  start(): Promise<StudySessionStart> {
    return startStudySession();
  }

  async submitReview(input: CardReviewInput): Promise<void> {
    await submitCardReview(input);
  }

  async end(sessionId: string): Promise<void> {
    await endStudySession(sessionId);
  }
}
