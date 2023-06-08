package com.victorc.gymnotebook.controllers;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.victorc.gymnotebook.dtos.GetUserDtoResponse;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.security.services.UserDetailsServiceImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/test")
public class TestController {

  @Autowired
  UserDetailsServiceImpl userDetailsService;

  @GetMapping("/all")
  public String allAccess() {
    return "Public Content.";
  }

  @GetMapping("/user")
  @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
  public String userAccess() {
    return "User Content.";
  }

  @GetMapping("/mod")
  @PreAuthorize("hasRole('MODERATOR')")
  public String moderatorAccess() {
    return "Moderator Board.";
  }

  @GetMapping("/admin")
  @PreAuthorize("hasRole('ADMIN')")
  public String adminAccess(Principal principal) {
    return "Admin Board for: " + principal.getName();
  }

  // Recuperar la entidad usuario a partir del principal
  @GetMapping("/me")
  @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
  public GetUserDtoResponse me(Principal principal) {
    User user = userDetailsService.getUserByUsername(principal.getName());

    return new GetUserDtoResponse(user.getId(), user.getUsername(), user.getEmail(), null, user.getRoles());
    /*UserDetailsServiceImpl userDetailsServiceImpl = new UserDetailsServiceImpl();
    UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    UserDetails user = userDetailsServiceImpl.loadUserByUsername(userDetails.getUsername());*/

   // return user;
    /*GetUserDto getUserDto = new GetUserDto(user.getId(), user.getUsername(), user.getEmail(), null, user.getRoles());
    return getUserDto;*/
  }



}
