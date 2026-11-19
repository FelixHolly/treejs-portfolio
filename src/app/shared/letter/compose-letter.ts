import { ContactForm } from "../../models/contact.model";

/** The letter as the visitor leaves it on the sheet; an empty topic means none was circled. */
export interface LetterDraft extends ContactForm {
  topic: string;
}

/** The letter as it reaches its reader: a circled topic becomes the "Re:" line that opens the message. */
export function composeLetter({ topic, ...letter }: LetterDraft): ContactForm {
  return topic ? { ...letter, message: `Re: ${topic}\n\n${letter.message}` } : letter;
}
