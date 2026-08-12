ALTER TABLE `testimonials`
ADD COLUMN `source` enum('manual','client') NOT NULL DEFAULT 'manual' AFTER `rating`;
