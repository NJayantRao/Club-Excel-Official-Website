"use client";

import { EventFormField } from "@prisma/client";
import LinkifiedText from "@/components/ui/LinkifiedText";
import { EVENT_TIME_ZONE } from "@/lib/datetime";
import axios from "axios";
import { isInstituteEmail, isInstituteEmailField } from "@/lib/institute-email";
import {
  filterGroupOptions,
  findRollNumberField,
  getAcademicYear,
  isGroupAllowed,
  isGroupField,
  isGroupRuleEnabled,
} from "@/lib/group-eligibility";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  venue: string | null;
  capacity: number | null;
  startAt: Date | string;
  formFields: EventFormField[];
  whatsappLink: string | null;
}

interface PersonalDetails {
  name: string;
  email: string;
  phone: string;
  college: string;
}

const EMPTY_DETAILS: PersonalDetails = {
  name: "",
  email: "",
  phone: "",
  college: "",
};

export default function RegisterEventPage() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventData | null>(null);

  const [details, setDetails] = useState<PersonalDetails>(EMPTY_DETAILS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Group rule (only for events listed in lib/group-eligibility.ts):
  // the year is worked out from the roll number and filters the group options.
  const rollField = isGroupRuleEnabled(id)
    ? findRollNumberField(event?.formFields ?? [])
    : undefined;
  const ruleApplies = !!rollField;

  const academicYear = getAcademicYear(
    rollField ? answers[rollField.name] : ""
  );
  const isRuledGroup = (fieldName: string) =>
    ruleApplies && isGroupField(fieldName);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await axios.get(`/api/events/${id}`);

        if (data.success) {
          setEvent(data.event);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // If the roll number changes, clear a chosen group that is no longer allowed
  useEffect(() => {
    if (!ruleApplies || !event) return;

    setAnswers((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const field of event.formFields) {
        if (field.type !== "SELECT" || !isGroupField(field.name)) continue;

        const chosen = next[field.name];
        if (!chosen) continue;

        if (academicYear === null || !isGroupAllowed(chosen, academicYear)) {
          delete next[field.name];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [academicYear, event, ruleApplies]);

  // Options/placeholder for a dropdown (the group dropdown is filtered by year)
  const getSelectConfig = (field: EventFormField) => {
    if (!isRuledGroup(field.name)) {
      return {
        options: field.options,
        placeholder: field.placeholder || "Select an option",
        disabled: false,
      };
    }

    if (!answers[rollField!.name]?.trim()) {
      return {
        options: [] as string[],
        placeholder: field.placeholder || "Enter Roll Number First",
        disabled: true,
      };
    }

    if (academicYear === null) {
      return {
        options: [] as string[],
        placeholder: "Enter a valid roll number",
        disabled: true,
      };
    }

    return {
      options: filterGroupOptions(field.options, academicYear),
      placeholder: "Select your group",
      disabled: false,
    };
  };

  const updateDetail = (key: keyof PersonalDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateAnswer = (fieldName: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!details.name.trim()) nextErrors.name = "Name is required";
    if (!details.email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(details.email))
      nextErrors.email = "Enter a valid email";

    for (const field of event?.formFields ?? []) {
      if (
        field.type === "SELECT" &&
        isRuledGroup(field.name) &&
        academicYear === null
      ) {
        nextErrors[rollField!.name] =
          "Enter a valid roll number (e.g. 2024XXXXX)";
        continue;
      }

      if (field.required && !answers[field.name]?.trim()) {
        nextErrors[field.name] = `${field.label} is required`;
      } else if (
        isInstituteEmailField(field) &&
        answers[field.name]?.trim() &&
        !isInstituteEmail(answers[field.name])
      ) {
        nextErrors[field.name] = "Must be a valid @nist.edu email";
      }
    }

    if (!agreed) nextErrors.agreed = "You must confirm before registering";

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmitError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await axios.post(`/api/events/${id}/responses`, {
        name: details.name,
        email: details.email,
        phone: details.phone || undefined,
        college: details.college || undefined,
        answers,
      });

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSubmitError(
          error.response?.data?.message ?? "Failed to submit registration."
        );
      } else {
        setSubmitError("Failed to submit registration.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-24 text-center text-white">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tighter uppercase">
          You&apos;re Registered!
        </h1>

        <p className="mb-12 max-w-xl text-lg font-light leading-relaxed text-neutral-400">
          Your registration for &ldquo;{event.title}&rdquo; has been received.
        </p>

        <div className="flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:w-auto sm:flex-row">
          {event.whatsappLink && (
            <a
              href={event.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-green-500 sm:w-auto sm:px-8 sm:text-sm"
            >
              <MessageCircle className="h-5 w-5 shrink-0" /> Join WhatsApp Group
            </a>
          )}

          <Link
            href="/events"
            className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 sm:w-auto sm:px-8 sm:text-sm"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startAt);

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-20 pt-24 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Event Card */}
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="mb-3 text-4xl font-bold">{event.title}</h1>

          <p className="mb-8 whitespace-pre-line leading-relaxed text-neutral-400">
            <LinkifiedText text={event?.description ?? ""} />
          </p>

          <div className="grid gap-4 text-sm text-neutral-400 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-400" />
              {startDate.toLocaleDateString("en-IN", {
                timeZone: EVENT_TIME_ZONE,
              })}
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-blue-400" />
              {startDate.toLocaleTimeString("en-IN", {
                timeZone: EVENT_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-400" />
              {event.venue}
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-blue-400" />
              Capacity: {event.capacity}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-300">
            {submitError}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          {/* Personal Details */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-2xl font-semibold">Personal Details</h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Full Name *
                </label>

                <input
                  value={details.name}
                  onChange={(e) => updateDetail("name", e.target.value)}
                  className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500 ${
                    errors.name ? "border-red-500/50" : "border-white/10"
                  }`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Email *
                </label>

                <input
                  type="email"
                  value={details.email}
                  onChange={(e) => updateDetail("email", e.target.value)}
                  className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500 ${
                    errors.email ? "border-red-500/50" : "border-white/10"
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Phone
                </label>

                <input
                  value={details.phone}
                  onChange={(e) => updateDetail("phone", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  College
                </label>

                <input
                  value={details.college}
                  onChange={(e) => updateDetail("college", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Your College"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Fields */}
          {event.formFields.length > 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
              <h2 className="mb-6 text-2xl font-semibold">
                Additional Information
              </h2>

              <div className="space-y-5">
                {event.formFields.map((field) => (
                  <div key={field.id}>
                    <label className="mb-2 block text-sm text-neutral-300">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-red-400">*</span>
                      )}
                    </label>

                    {field.type === "SELECT" ? (
                      (() => {
                        const config = getSelectConfig(field);

                        return (
                          <select
                            value={answers[field.name] ?? ""}
                            disabled={config.disabled}
                            onChange={(e) =>
                              updateAnswer(field.name, e.target.value)
                            }
                            className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                              errors[field.name]
                                ? "border-red-500/50"
                                : "border-white/10"
                            }`}
                          >
                            <option value="" className="bg-neutral-900">
                              {config.placeholder}
                            </option>
                            {config.options.map((option) => (
                              <option
                                key={option}
                                value={option}
                                className="bg-neutral-900"
                              >
                                {option}
                              </option>
                            ))}
                          </select>
                        );
                      })()
                    ) : field.type === "TEXTAREA" ? (
                      <textarea
                        rows={5}
                        value={answers[field.name] ?? ""}
                        onChange={(e) =>
                          updateAnswer(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || "Enter text here"}
                        className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500 ${
                          errors[field.name]
                            ? "border-red-500/50"
                            : "border-white/10"
                        }`}
                      />
                    ) : (
                      <input
                        type={
                          field.type === "NUMBER"
                            ? "number"
                            : field.type === "EMAIL"
                              ? "email"
                              : field.type === "PHONE"
                                ? "tel"
                                : field.type === "URL"
                                  ? "url"
                                  : "text"
                        }
                        value={answers[field.name] ?? ""}
                        onChange={(e) =>
                          updateAnswer(field.name, e.target.value)
                        }
                        placeholder={field.placeholder || "Enter text here"}
                        className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition focus:border-blue-500 ${
                          errors[field.name]
                            ? "border-red-500/50"
                            : "border-white/10"
                        }`}
                      />
                    )}

                    {errors[field.name] && (
                      <p className="mt-1 text-xs text-red-400">
                        {errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <label className="flex items-start gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setErrors((prev) => ({ ...prev, agreed: "" }));
                }}
                className="mt-1 accent-white"
              />

              <span>
                I confirm that all the information provided above is correct and
                I agree to abide by the rules of the event.
              </span>
            </label>
            {errors.agreed && (
              <p className="mt-2 text-xs text-red-400">{errors.agreed}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 w-full rounded-2xl bg-white py-4 text-lg font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Register Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
