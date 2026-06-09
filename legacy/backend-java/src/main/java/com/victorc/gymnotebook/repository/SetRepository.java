package com.victorc.gymnotebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.Set;

public interface SetRepository  extends JpaRepository<Set, Long> {
	
}
