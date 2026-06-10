CREATE TABLE `mobile_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`user_id` bigint NOT NULL,
	`token_family_id` varchar(64) NOT NULL,
	`refresh_token_hash` varchar(128) NOT NULL,
	`previous_session_row_id` bigint,
	`replaced_by_session_row_id` bigint,
	`device_name` varchar(80),
	`device_platform` varchar(16),
	`created_at` datetime NOT NULL,
	`last_used_at` datetime NOT NULL,
	`rotated_at` datetime,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	CONSTRAINT `mobile_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mobile_sessions_refresh_token_hash_unique` UNIQUE(`refresh_token_hash`)
);
--> statement-breakpoint
ALTER TABLE `mobile_sessions` ADD CONSTRAINT `mobile_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_sessions` ADD CONSTRAINT `mobile_sessions_previous_session_row_id_mobile_sessions_id_fk` FOREIGN KEY (`previous_session_row_id`) REFERENCES `mobile_sessions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_sessions` ADD CONSTRAINT `mobile_sessions_replaced_by_session_row_id_mobile_sessions_id_fk` FOREIGN KEY (`replaced_by_session_row_id`) REFERENCES `mobile_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mobile_sessions_session_id_idx` ON `mobile_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_user_id_idx` ON `mobile_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_token_family_id_idx` ON `mobile_sessions` (`token_family_id`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_expiry_revocation_idx` ON `mobile_sessions` (`expires_at`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_user_active_idx` ON `mobile_sessions` (`user_id`,`revoked_at`,`expires_at`,`replaced_by_session_row_id`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_previous_row_idx` ON `mobile_sessions` (`previous_session_row_id`);--> statement-breakpoint
CREATE INDEX `mobile_sessions_replaced_by_row_idx` ON `mobile_sessions` (`replaced_by_session_row_id`);
