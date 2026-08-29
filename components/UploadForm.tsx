"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ImageIcon, Upload, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import LoadingOverlay from "@/components/LoadingOverlay"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  voiceCategories,
  voiceOptions,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

const voiceKeys = ["dave", "daniel", "chris", "rachel", "sarah"] as const

const uploadFormSchema = z.object({
  pdf: z
    .custom<File>((file) => file instanceof File, "PDF file is required")
    .refine(
      (file) => ACCEPTED_PDF_TYPES.includes(file.type),
      "Only PDF files are accepted"
    )
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      "PDF must be 50MB or smaller"
    ),
  cover: z
    .custom<File | undefined>(
      (file) => file === undefined || file instanceof File,
      "Invalid cover image"
    )
    .optional()
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Cover must be a JPEG, PNG, or WebP image"
    )
    .refine(
      (file) => !file || file.size <= MAX_IMAGE_SIZE,
      "Cover image must be 10MB or smaller"
    ),
  title: z.string().trim().min(1, "Title is required"),
  author: z.string().trim().min(1, "Author name is required"),
  voice: z.enum(voiceKeys, { message: "Please select a voice" }),
})

type UploadFormValues = z.infer<typeof uploadFormSchema>

type FileDropzoneProps = {
  value?: File
  onChange: (file: File | undefined) => void
  accept: string
  icon: React.ReactNode
  label: string
  hint: string
}

function FileDropzone({
  value,
  onChange,
  accept,
  icon,
  label,
  hint,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (file: File | undefined) => {
    onChange(file)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => handleSelect(event.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "upload-dropzone border-2 border-dashed border-[#d4c4a8]",
          value && "upload-dropzone-uploaded"
        )}
        onClick={() => {
          if (!value) {
            inputRef.current?.click()
          }
        }}
        onKeyDown={(event) => {
          if (!value && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {value ? (
          <div className="flex items-center gap-3 px-4">
            <p className="upload-dropzone-text truncate">{value.name}</p>
            <button
              type="button"
              aria-label="Remove file"
              className="upload-dropzone-remove"
              onClick={(event) => {
                event.stopPropagation()
                handleSelect(undefined)
              }}
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <>
            {icon}
            <p className="upload-dropzone-text">{label}</p>
            <p className="upload-dropzone-hint">{hint}</p>
          </>
        )}
      </div>
    </div>
  )
}

const voiceGroupLabels = {
  male: "Male Voices",
  female: "Female Voices",
} as const

const UploadForm = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: DEFAULT_VOICE,
    },
  })

  const onSubmit = async (values: UploadFormValues) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("pdf", values.pdf)
      if (values.cover) {
        formData.append("cover", values.cover)
      }
      formData.append("title", values.title)
      formData.append("author", values.author)
      formData.append("voice", values.voice)
      formData.append("voiceId", voiceOptions[values.voice].id)

      const response = await fetch("/api/books", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload book")
      }

      const data = (await response.json()) as { slug?: string }
      router.push(data.slug ? `/books/${data.slug}` : "/")
    } catch {
      form.setError("root", {
        message: "Something went wrong while uploading. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <FormField
            control={form.control}
            name="pdf"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FileDropzone
                    value={field.value}
                    onChange={field.onChange}
                    accept=".pdf,application/pdf"
                    icon={<Upload className="upload-dropzone-icon" />}
                    label="Click to upload PDF"
                    hint="PDF file (max 50MB)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cover"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FileDropzone
                    value={field.value}
                    onChange={field.onChange}
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    icon={<ImageIcon className="upload-dropzone-icon" />}
                    label="Click to upload cover image"
                    hint="Leave empty to auto-generate from PDF"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="ex: Rich Dad Poor Dad"
                    className="form-input h-auto border-0 shadow-soft-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Author Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="ex: Robert Kiyosaki"
                    className="form-input h-auto border-0 shadow-soft-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">
                  Choose Assistant Voice
                </FormLabel>
                <FormControl>
                  <div className="space-y-6">
                    {(Object.keys(voiceCategories) as Array<
                      keyof typeof voiceCategories
                    >).map((category) => (
                      <div key={category} className="space-y-3">
                        <p className="text-base font-medium text-[var(--text-secondary)]">
                          {voiceGroupLabels[category]}
                        </p>
                        <div className="voice-selector-options flex-col sm:flex-row">
                          {voiceCategories[category].map((voiceKey) => {
                            const voice =
                              voiceOptions[voiceKey as keyof typeof voiceOptions]
                            const isSelected = field.value === voiceKey

                            return (
                              <label
                                key={voiceKey}
                                className={cn(
                                  "voice-selector-option flex-col items-start justify-start text-left",
                                  isSelected
                                    ? "voice-selector-option-selected"
                                    : "voice-selector-option-default"
                                )}
                              >
                                <input
                                  type="radio"
                                  name="voice"
                                  value={voiceKey}
                                  checked={isSelected}
                                  onChange={() => field.onChange(voiceKey)}
                                  className="sr-only"
                                />
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {voice.name}
                                </span>
                                <span className="text-sm text-[var(--text-secondary)]">
                                  {voice.description}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="form-btn"
          >
            Begin Synthesis
          </Button>
        </form>
      </Form>
    </>
  )
}

export default UploadForm
