package com.example.progetto_parking_system.dto;

import lombok.Data;

@Data
public class SpotDTO {
    private Long id;
    private int number;
    private String type;
    private boolean reserved;
    private String level;
    private String zone;
    private double pricePerHour;
    private boolean taken;

}
