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
 * Servizio per la generazione di QR code come immagini PNG.
 * Utilizza la libreria ZXing (com.google.zxing).
 */
@Service
public class QrCodeService {

    private static final int DEFAULT_SIZE = 250;

    /**
     * Genera un QR code PNG a partire dal contenuto fornito.
     *
     * @param content il testo/token da codificare nel QR
     * @param width   larghezza in pixel
     * @param height  altezza in pixel
     * @return array di byte del PNG generato
     */
    public byte[] generateQrPng(String content, int width, int height) {
        QRCodeWriter writer = new QRCodeWriter();
        try {
            BitMatrix matrix = writer.encode(
                    content,
                    BarcodeFormat.QR_CODE,
                    width,
                    height,
                    Map.of(EncodeHintType.MARGIN, 1)
            );
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new RuntimeException("Errore nella generazione del QR code", e);
        }
    }

    /**
     * Genera un QR code PNG con dimensione di default (250×250 px).
     *
     * @param content il testo/token da codificare
     * @return array di byte del PNG generato
     */
    public byte[] generateQrPng(String content) {
        return generateQrPng(content, DEFAULT_SIZE, DEFAULT_SIZE);
    }
}
