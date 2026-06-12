"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface RegisterContextType {
    phone: string;
    setPhone: (v: string) => void;
    imei: string;
    setImei: (v: string) => void;
    brand: string;
    setBrand: (v: string) => void;
    model: string;
    setModel: (v: string) => void;
    devicePrice: string;
    setDevicePrice: (v: string) => void;
    deviceType: string;
    setDeviceType: (v: string) => void;
    packageType: string;
    setPackageType: (v: string) => void;
    deviceImages: { [key: string]: string | null };
    setDeviceImages: (key: string, v: string | null) => void;
    receiptImage: string | null;
    setReceiptImage: (v: string | null) => void;
    // Personal Info
    firstName: string;
    setFirstName: (v: string) => void;
    lastName: string;
    setLastName: (v: string) => void;
    idCard: string;
    setIdCard: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    // Address Info
    postCode: string;
    setPostCode: (v: string) => void;
    province: string;
    setProvince: (v: string) => void;
    district: string;
    setDistrict: (v: string) => void;
    subDistrict: string;
    setSubDistrict: (v: string) => void;
    addressDetails: string;
    setAddressDetails: (v: string) => void;
    agentCode: string;
    setAgentCode: (v: string) => void;

    registrationResult: any;
    setRegistrationResult: (v: any) => void;
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

export function RegisterProvider({ children }: { children: React.ReactNode }) {
    const [phone, setPhone] = useState("");
    const [imei, setImei] = useState("");
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [devicePrice, setDevicePrice] = useState("");
    const [deviceType, setDeviceType] = useState("");
    const [packageType, setPackageType] = useState("");
    const [deviceImages, setDeviceImagesState] = useState<{ [key: string]: string | null }>({
        front: null, back: null, left: null, right: null, top: null, bottom: null
    });
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [idCard, setIdCard] = useState("");
    const [email, setEmail] = useState("");
    const [postCode, setPostCode] = useState("");
    const [province, setProvince] = useState("");
    const [district, setDistrict] = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [addressDetails, setAddressDetails] = useState("");
    const [agentCode, setAgentCode] = useState("");
    const [registrationResult, setRegistrationResult] = useState<any>(null);

    // Initial Load (Text only)
    useEffect(() => {
        const saved = localStorage.getItem("registerState_text");
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.phone) setPhone(data.phone);
                if (data.imei) setImei(data.imei);
                if (data.brand) setBrand(data.brand);
                if (data.model) setModel(data.model);
                if (data.devicePrice) setDevicePrice(data.devicePrice);
                if (data.deviceType) setDeviceType(data.deviceType);
                if (data.packageType) setPackageType(data.packageType);
                if (data.firstName) setFirstName(data.firstName);
                if (data.lastName) setLastName(data.lastName);
                if (data.idCard) setIdCard(data.idCard);
                if (data.email) setEmail(data.email);
                if (data.postCode) setPostCode(data.postCode);
                if (data.province) setProvince(data.province);
                if (data.district) setDistrict(data.district);
                if (data.subDistrict) setSubDistrict(data.subDistrict);
                if (data.addressDetails) setAddressDetails(data.addressDetails);
                if (data.agentCode) setAgentCode(data.agentCode);
            } catch (e) {
                console.error("Error loading registerState_text", e);
            }
        }
    }, []);

    // Save Text only (Avoid images in localStorage because they are huge)
    useEffect(() => {
        const state = {
            phone, imei, brand, model, devicePrice, deviceType, packageType,
            firstName, lastName, idCard, email, postCode, province, district, subDistrict, addressDetails, agentCode
        };
        try {
            localStorage.setItem("registerState_text", JSON.stringify(state));
        } catch (e) {
            console.error("Quota exceeded for text only state", e);
        }
    }, [phone, imei, brand, model, devicePrice, packageType, firstName, lastName, idCard, email, postCode, province, district, subDistrict, addressDetails, agentCode]);

    const setDeviceImages = (key: string, v: string | null) => {
        setDeviceImagesState(prev => ({ ...prev, [key]: v }));
    };

    return (
        <RegisterContext.Provider value={{
            phone, setPhone, imei, setImei, brand, setBrand, model, setModel,
            devicePrice, setDevicePrice, deviceType, setDeviceType, packageType, setPackageType,
            deviceImages, setDeviceImages, receiptImage, setReceiptImage,
            firstName, setFirstName, lastName, setLastName, idCard, setIdCard, email, setEmail,
            postCode, setPostCode, province, setProvince, district, setDistrict, subDistrict, setSubDistrict, addressDetails, setAddressDetails,
            agentCode, setAgentCode, registrationResult, setRegistrationResult
        }}>
            {children}
        </RegisterContext.Provider>
    );
}

export function useRegister() {
    const context = useContext(RegisterContext);
    if (!context) throw new Error("useRegister must be used within RegisterProvider");
    return context;
}
