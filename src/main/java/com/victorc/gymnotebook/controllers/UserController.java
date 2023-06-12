package com.victorc.gymnotebook.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.victorc.gymnotebook.models.ERole;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.payload.request.ModifyRoleRequest;
import com.victorc.gymnotebook.payload.response.GetUserDtoResponse;
import com.victorc.gymnotebook.payload.response.MessageResponse;
import com.victorc.gymnotebook.payload.response.UserResponse;
import com.victorc.gymnotebook.repository.RoleRepository;
import com.victorc.gymnotebook.repository.UserRepository;
import com.victorc.gymnotebook.security.services.UserDetailsServiceImpl;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/user")
public class UserController {
	
	@Autowired
  UserRepository userRepository;

  @Autowired
  RoleRepository roleRepository;

  @Autowired
  UserDetailsServiceImpl userDetailsService;

  @GetMapping
  @PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
  public ResponseEntity<List<UserResponse>> getAllUsers() {
    List<User> users = userRepository.findAll();

    List<UserResponse> usersResponse = users.stream().map(user -> {
      return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRoles());
    }).toList();

    return ResponseEntity.ok(usersResponse);
  }

  @GetMapping("/verifyuser/{username}/{email}")
  public ResponseEntity<?> verifyUsernameAndEmail(@PathVariable String username, @PathVariable String email) {
    if (userRepository.existsByUsername(username)) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El nombre de usuario ya está en uso!"));
    }

    if (userRepository.existsByEmail(email)) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El email ya está en uso!"));
    }

    return ResponseEntity.ok(new MessageResponse("¡Usuario y email disponibles!"));
  }

  @GetMapping("/me")
  @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
  public GetUserDtoResponse me(Principal principal) {
    User user = userDetailsService.getUserByUsername(principal.getName());

    return new GetUserDtoResponse(user.getId(), user.getUsername(), user.getEmail(), null, user.getRoles());
  }

  @PutMapping("/setpermissions")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<?> setPermissions(@Valid @RequestBody ModifyRoleRequest modifyRoleRequest) {
    if (!userRepository.existsById(modifyRoleRequest.getUserId())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El usuario no existe."));
    }

    User user = userRepository.findById(modifyRoleRequest.getUserId()).get();
  
    if (modifyRoleRequest.getNewRole() == ERole.ROLE_ADMIN) {
      if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_ADMIN).get())) {
        return ResponseEntity
            .badRequest()
            .body(new MessageResponse("Error: El usuario ya es administrador."));
      }

      user.getRoles().add(roleRepository.findByName(ERole.ROLE_ADMIN).get());

      // Si el usuario que hace la petición es un moderador, puede dar permisos de moderador a otros usuarios.
    } else if (modifyRoleRequest.getNewRole() == ERole.ROLE_MODERATOR) {

      if (user.getRoles().contains(roleRepository.findByName(ERole.ROLE_MODERATOR).get())) {
        return ResponseEntity
            .badRequest()
            .body(new MessageResponse("Error: El usuario ya es moderador."));
      }

      user.getRoles().add(roleRepository.findByName(ERole.ROLE_MODERATOR).get());
    } else {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El rol no existe."));
    }
    return null;
  }

  @PutMapping("/removepermissions")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<?> removePermissions(@Valid @RequestBody ModifyRoleRequest modifyRoleRequest) {
    if (!userRepository.existsById(modifyRoleRequest.getUserId())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El usuario no existe."));
    }

    User user = userRepository.findById(modifyRoleRequest.getUserId()).get();
  
    if (modifyRoleRequest.getNewRole() == ERole.ROLE_ADMIN) {
      if (!user.getRoles().contains(roleRepository.findByName(ERole.ROLE_ADMIN).get())) {
        return ResponseEntity
            .badRequest()
            .body(new MessageResponse("Error: El usuario no es administrador."));
      }

      user.getRoles().remove(roleRepository.findByName(ERole.ROLE_ADMIN).get());

    } else if (modifyRoleRequest.getNewRole() == ERole.ROLE_MODERATOR) {

      if (!user.getRoles().contains(roleRepository.findByName(ERole.ROLE_MODERATOR).get())) {
        return ResponseEntity
            .badRequest()
            .body(new MessageResponse("Error: El usuario no es moderador."));
      }

      user.getRoles().remove(roleRepository.findByName(ERole.ROLE_MODERATOR).get());
    } else {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El rol no existe."));
    }
    return null;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<?> deleteUser(@PathVariable Long id) {
    if (!userRepository.existsById(id)) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: El usuario no existe."));
    }

    userRepository.deleteById(id);

    return ResponseEntity.ok(new MessageResponse("Usuario eliminado correctamente."));
  }
}
