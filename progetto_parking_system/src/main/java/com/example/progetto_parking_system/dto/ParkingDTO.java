package com.example.progetto_parking_system.dto;

import java.util.List;
import lombok.Data;

@Data
public class ParkingDTO {
    private Long id;
    private String name;
    private String address;
    private double maxCapacity;
    private double currentOccupancy;
    private double hourlyRate;
    private List<SpotDTO> spots;
}
