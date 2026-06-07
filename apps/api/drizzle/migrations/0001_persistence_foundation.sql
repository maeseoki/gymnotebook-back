ALTER TABLE `exercises` DROP FOREIGN KEY `exercises_image_id_image_data_id_fk`;
--> statement-breakpoint
ALTER TABLE `exercises` DROP FOREIGN KEY `exercises_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `sets` DROP FOREIGN KEY `sets_workout_set_id_workout_sets_id_fk`;
--> statement-breakpoint
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_role_id_roles_id_fk`;
--> statement-breakpoint
ALTER TABLE `workout_sets` DROP FOREIGN KEY `workout_sets_workout_id_workouts_id_fk`;
--> statement-breakpoint
ALTER TABLE `workout_sets` DROP FOREIGN KEY `workout_sets_exercise_id_exercises_id_fk`;
--> statement-breakpoint
ALTER TABLE `workouts` DROP FOREIGN KEY `workouts_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `sets` MODIFY COLUMN `is_drop_set` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `image_data` ADD `user_id` bigint;--> statement-breakpoint
UPDATE `image_data` AS `image`
INNER JOIN (
	SELECT
		`image_id`,
		MIN(`user_id`) AS `user_id`,
		COUNT(DISTINCT `user_id`) AS `owner_count`
	FROM `exercises`
	WHERE `image_id` IS NOT NULL
	GROUP BY `image_id`
) AS `inferred_owner`
	ON `image`.`id` = `inferred_owner`.`image_id`
SET `image`.`user_id` = `inferred_owner`.`user_id`
WHERE `inferred_owner`.`owner_count` = 1;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_name_unique` UNIQUE(`name`);--> statement-breakpoint
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_uuid_unique` UNIQUE(`uuid`);--> statement-breakpoint
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_image_id_image_data_id_fk` FOREIGN KEY (`image_id`) REFERENCES `image_data`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `image_data` ADD CONSTRAINT `image_data_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sets` ADD CONSTRAINT `sets_workout_set_id_workout_sets_id_fk` FOREIGN KEY (`workout_set_id`) REFERENCES `workout_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_workout_id_workouts_id_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `exercises_user_id_idx` ON `exercises` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercises_image_id_idx` ON `exercises` (`image_id`);--> statement-breakpoint
CREATE INDEX `image_data_user_id_idx` ON `image_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `sets_workout_set_id_idx` ON `sets` (`workout_set_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_id_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_workout_id_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_id_idx` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workouts_user_start_date_idx` ON `workouts` (`user_id`,`start_date`);
