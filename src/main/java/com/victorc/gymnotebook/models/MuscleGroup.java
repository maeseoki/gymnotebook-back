package com.victorc.gymnotebook.models;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "muscle_groups")
@Data

@NoArgsConstructor
@AllArgsConstructor
public class MuscleGroup {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String name;

	private String description;

	@OneToOne
	private ImageData image;

	@ManyToMany(mappedBy = "muscleGroups", fetch = FetchType.LAZY)
	private List<Exercise> exercises = new ArrayList<>();
}
