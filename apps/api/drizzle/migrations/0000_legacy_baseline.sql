CREATE TABLE `exercises` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`image_id` bigint,
	`description` varchar(255),
	`type` varchar(255) NOT NULL,
	`primary_muscle_group` varchar(255) NOT NULL,
	`secondary_muscle_group` varchar(255),
	`user_id` bigint NOT NULL,
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image_data` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`image_data` mediumblob NOT NULL,
	CONSTRAINT `image_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(20) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sets` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`reps` int NOT NULL,
	`weight` int NOT NULL,
	`time` int NOT NULL,
	`distance` int NOT NULL,
	`notes` varchar(255),
	`is_drop_set` int NOT NULL,
	`workout_set_id` bigint NOT NULL,
	`start_date` datetime,
	CONSTRAINT `sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` bigint NOT NULL,
	`role_id` int NOT NULL,
	CONSTRAINT `user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`username` varchar(20) NOT NULL,
	`email` varchar(50) NOT NULL,
	`password` varchar(120) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`workout_id` bigint NOT NULL,
	`exercise_id` bigint NOT NULL,
	`start_date` datetime,
	`end_date` datetime,
	`notes` varchar(255),
	CONSTRAINT `workout_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uuid` varchar(255) NOT NULL,
	`user_id` bigint,
	`start_date` datetime,
	`end_date` datetime,
	`notes` varchar(255),
	CONSTRAINT `workouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_image_id_image_data_id_fk` FOREIGN KEY (`image_id`) REFERENCES `image_data`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sets` ADD CONSTRAINT `sets_workout_set_id_workout_sets_id_fk` FOREIGN KEY (`workout_set_id`) REFERENCES `workout_sets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_workout_id_workouts_id_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_exercise_id_exercises_id_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;