package com.example.progetto_parking_system.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

/**
 * Servizio tecnico per la generazione di codici QR in formato immagine PNG.
 * Viene utilizzato per creare i ticket di ingresso al parcheggio e i pass degli abbonati.
 * Sfrutta la libreria open-source Google ZXing.
 */
@Service
public class QrCodeService {

    // Dimensione predefinita del QR code (larghezza e altezza in pixel)
    private static final int DEFAULT_SIZE = 250;

    /**
     * Genera un QR code in formato PNG partendo da una stringa di testo (token univoco).
     *
     * @param content La stringa alfanumerica da codificare nel QR
     * @param width   Larghezza desiderata dell'immagine finale (px)
     * @param height  Altezza desiderata dell'immagine finale (px)
     * @return Array di byte che rappresentano l'immagine PNG generata
     */
    public byte[] generateQrPng(String content, int width, int height) {
        QRCodeWriter writer = new QRCodeWriter();
        try {
            // Genera la matrice di bit del QR code con margini minimi
            BitMatrix matrix = writer.encode(
                    content,
                    BarcodeFormat.QR_CODE,
                    width,
                    height,
                    Map.of(EncodeHintType.MARGIN, 1)
            );
            
            // Scrive la matrice su uno stream di byte in formato PNG
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            // Rilancia l'eccezione come RuntimeException per semplificare la gestione nel controller
            throw new RuntimeException("Impossibile generare l'immagine QR code", e);
        }
    }

    /**
     * Versione semplificata per generare un QR code con dimensioni standard (250x250).
     *
     * @param content Il testo da codificare
     * @return L'immagine PNG come array di byte
     */
    public byte[] generateQrPng(String content) {
        return generateQrPng(content, DEFAULT_SIZE, DEFAULT_SIZE);
    }
}
