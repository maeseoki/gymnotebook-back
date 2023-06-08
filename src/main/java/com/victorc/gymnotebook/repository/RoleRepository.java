package com.victorc.gymnotebook.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.ERole;
import com.victorc.gymnotebook.models.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {
  Optional<Role> findByName(ERole name);
}
