package com.victorc.gymnotebook.controllers;

import com.victorc.gymnotebook.models.ERole;
import com.victorc.gymnotebook.models.Role;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.payload.request.LoginRequest;
import com.victorc.gymnotebook.payload.request.SignupRequest;
import com.victorc.gymnotebook.payload.response.JwtResponse;
import com.victorc.gymnotebook.payload.response.MessageResponse;
import com.victorc.gymnotebook.repository.RoleRepository;
import com.victorc.gymnotebook.repository.UserRepository;
import com.victorc.gymnotebook.security.jwt.JwtUtils;
import com.victorc.gymnotebook.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  @Autowired
  AuthenticationManager authenticationManager;

  @Autowired
  UserRepository userRepository;

  @Autowired
  RoleRepository roleRepository;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  JwtUtils jwtUtils;

  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = jwtUtils.generateJwtToken(authentication);
    
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();    
    List<String> roles = userDetails.getAuthorities().stream()
        .map(item -> item.getAuthority())
        .collect(Collectors.toList());

    return ResponseEntity.ok(new JwtResponse(jwt, 
                         userDetails.getId(), 
                         userDetails.getUsername(), 
                         userDetails.getEmail(), 
                         roles));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("¡El nombre de usuario ya está en uso!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("¡El email ya está en uso!"));
    }

    // Creamos la cuenta de usuario.
    User user = new User(signUpRequest.getUsername(), 
               signUpRequest.getEmail(),
               encoder.encode(signUpRequest.getPassword()));

    Set<String> strRoles = signUpRequest.getRole();
    Set<Role> roles = new HashSet<>();

    if (strRoles == null) {
      Role userRole = roleRepository.findByName(ERole.ROLE_USER)
          .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
      roles.add(userRole);
    } else {
      strRoles.forEach(role -> {
        switch (role) {
          // No permitimos crear usuarios con rol de administrador o moderador.
        /*case "admin":
          Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
              .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
          roles.add(adminRole);

          break;
        case "mod":
          Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
              .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
          roles.add(modRole);

          break;*/
        default:
          Role userRole = roleRepository.findByName(ERole.ROLE_USER)
              .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
          roles.add(userRole);
        }
      });
    }

    user.setRoles(roles);
    userRepository.save(user);

    URI location = ServletUriComponentsBuilder
      .fromCurrentContextPath().path("/api/users/{username}")
      .buildAndExpand(user.getUsername()).toUri();

  return ResponseEntity.created(location).body(new MessageResponse("¡Usuario registrado correctamente!"));
  }

  @GetMapping("/logout")
  public ResponseEntity<?> logout() {
    SecurityContextHolder.clearContext();
  
    return ResponseEntity.ok(new MessageResponse("¡Desconectado correctamente!"));
  }
}
