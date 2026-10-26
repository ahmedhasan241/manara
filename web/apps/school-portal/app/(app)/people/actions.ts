"use server";

import type { ActionResult } from "@educloud/ui";
import { addPerson, importPeople } from "@/app/builder-actions";

/** addPerson and importPeople for form pages (ToastForm passes only the form). */
export async function addPersonFromPage(form: FormData) {
  return (await addPerson({}, form)) as ActionResult;
}

export async function importPeopleFromPage(form: FormData) {
  return (await importPeople({}, form)) as ActionResult;
}
