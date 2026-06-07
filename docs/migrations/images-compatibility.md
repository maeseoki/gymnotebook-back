# Image Compatibility

| Legacy behavior | New behavior | Preserved or changed | Reason | Frontend impact |
| --- | --- | --- | --- | --- |
| `GET /api/image/{id}` was public and returned stored bytes with stored content type. | Public retrieval remains available and returns binary bytes with `Content-Type`, `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, and one-day public caching. | Preserved with safer headers. | Current frontend image rendering depends on public binary URLs. | Existing image display should continue to work. |
| Missing image retrieval returned a generic not-found response. | Missing image retrieval returns the common error contract with `404 image_not_found`. | Changed. | Stable machine-readable API errors are required by the Fastify foundation. | Clients should read `code` instead of parsing text. |
| Upload trusted multipart `Content-Type` and filename. | Upload detects file signatures with `file-type`; only JPEG, PNG, and WebP are accepted. Declared image MIME mismatches return `415 image_type_mismatch`. | Changed. | Prevents storing disguised or active-content files. | Frontend must send real supported image bytes; filename extension alone is irrelevant. |
| Upload accepted GIF/SVG when the client said so. | GIF and SVG are rejected with `415 image_unsupported_type`. | Changed. | GIF animation policy is deferred; SVG can contain active XML/script content. | Frontend should restrict pickers to JPEG, PNG, and WebP for now. |
| Empty upload returned an ad hoc text message. | Empty upload returns `400 image_empty`; missing image field returns `400 image_missing`. | Changed. | Errors now use the shared contract. | Clients can branch on stable codes. |
| Successful upload returned a bare numeric id. | Successful upload returns `{ "id": number }` validated by `ImageUploadResponseSchema`. | Changed. | Typed JSON response is required for the rewrite. | Frontend code expecting a bare number must be updated. |
| Uploaded images had no reliable owner in the legacy schema. | New uploads always store `image_data.user_id` from the JWT `userId`. | Changed. | Required for safe deletion and exercise image assignment. | Users can only delete images they uploaded. |
| Legacy rows with `user_id = NULL` could be acted on like normal rows. | Unresolved legacy rows remain publicly readable but cannot be deleted by ordinary users or newly assigned to exercises. | Changed. | Ownership cannot be proven safely. | Existing displayed images keep working; ownership resolution is a later migration/admin task. |
| Delete only checked image existence, then deleted by id. | Delete uses an ownership-aware predicate and hides missing, foreign-owned, and unresolved rows as `404 image_not_found`. | Changed. | Avoids cross-user deletion and resource-existence leaks. | Deleting another user's image now appears like deleting a missing image. |
| The database FK from exercises to images uses `ON DELETE SET NULL`. | Application deletion rejects referenced owned images with `409 image_in_use` before deletion. | Changed. | Avoids accidental loss of exercise presentation data despite the compatibility FK. | Users must first detach or update exercises before deleting referenced images. |

## Notes

Image storage remains MySQL `MEDIUMBLOB` for compatibility with the Spring database. The API enforces `MAX_UPLOAD_SIZE` before insertion; object storage, image transformation, malware scanning, and MIME/content policy expansion are deferred.
