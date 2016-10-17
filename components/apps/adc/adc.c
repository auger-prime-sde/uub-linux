/*
Program to set ADC AD9628
R. Assiro april 2016
 */
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <linux/types.h>
#include <linux/spi/spidev.h>
#include <stdint.h>
#include <unistd.h>
#include <stdlib.h>
#include <getopt.h>
#include <stdlib.h>
#include <sys/mman.h>

 static uint8_t mode = 0;
 static uint8_t bits = 8;
 static uint32_t speed = 5000000;

// char ADC_ID[3] = {0x80,0x01,0x00} ; // chip ID
 //char ADC_ID[3] = {0x80,0x0D,0x01} ;


 char ADC_LVDS[3] = {0x00,0x14,0xA0} ; // ADC bus configuration LVDS interleave
 char ADC_RESET[3] = {0x00,0x00,0x3C} ; // ADC reset
 char ADC_VREF[3] = {0x00,0x18,0x04} ; // ADC VREF setting
 char ADC_PDWN[3] = {0x00,0x08,0x00} ; // ADC PDWN setting normal operation
 char ADC_DIG_RES[3] = {0x00,0x08,0x03} ; // ADC PWRD reset setting
 char ADC_DELAY[3] = {0x00,0x17,0x25} ; // ADC delay

 char cmd2channel[3] = {0x00,0x05,0x03}; // Select the 2 channels for previous cmd
 char cmdchannelA[3] = {0x00,0x05,0x01}; // Select the channel A for previous cmd
 char cmdchannelB[3] = {0x00,0x05,0x02}; // Select the channel B for previous cmd

 char TestModeMS[3]  = {0x00,0x0D,0x01}; // ADC Test Mode Middle Scale
 char TestModeFS[3]  = {0x00,0x0D,0x02}; // ADC Test Mode Full Scale
 char NormalMode[3] = {0x00,0x0D,0x00}; // ADC Normal mode
 char TestModeRM[3] = {0x00,0x0D,0x5F}; // ADC Test Mode Ramp
 char TestModeA5[3] = {0x00,0x0D,0x44}; // ADC Test Mode AAA555

 char TstUser1LSB[3] = {0x00,0x19,0x55}; // User defined pattern 1 LSB
 char TstUser1MSB[3] = {0x00,0x1A,0xAA}; // User defined pattern 1 MSB
 char TestModeUM[3]  = {0x00,0x0D,0x08}; // ADC Test Mode USER1
 char AdcDelay[5]    = {0x00};           // Calculated ADC delay table

 static void pabort(const char *s)
 {
 	perror(s);
 	abort();
 }

    char rd_buf[3];
    char buf[10];
	char buf2[10];
	int com_serial;
	int failcount;
	struct spi_ioc_transfer xfer[2];

int main()
{
			int file, k;
			char filename[20];
			int i, fd;
			int ret = 0;
			printf("Send data to ADC..... ");

			snprintf(filename, 19, "/dev/spidev32766.1");
										fd = open(filename, O_RDWR);
										if (fd < 0)
											pabort("can't open device");
									// spi mode
										ret = ioctl(fd, SPI_IOC_WR_MODE, &mode);
										if (ret == -1)
											pabort("can't set spi mode");

									ret = ioctl(fd, SPI_IOC_RD_MODE, &mode);
										if (ret == -1)
											pabort("can't get spi mode");

									// bits per word
										ret = ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits);
										if (ret == -1)
											pabort("can't set bits per word");

										ret = ioctl(fd, SPI_IOC_RD_BITS_PER_WORD, &bits);
										if (ret == -1)
											pabort("can't get bits per word");

									// max speed hz
										ret = ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed);
										if (ret == -1)
											pabort("can't set max speed hz");

										ret = ioctl(fd, SPI_IOC_RD_MAX_SPEED_HZ, &speed);
										if (ret == -1)
											pabort("can't get max speed hz");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

										char *buffer;
/*										char buf[10];
										file=spi_init("/dev/spidev0.0"); //dev
*/
										buf[0] = 0x41;
										buf[1] = 0xFF;
										spi_write(0xE6,0x0E,2,buf,file); //this will write value 0x41FF to the address 0xE60E

										buffer=(char *)spi_read(0xE6,0x0E,4,file); //reading the address 0xE60E




										if (write(fd, cmd2channel, sizeof(cmd2channel)) != sizeof(cmd2channel))
												exit(3);

										if (write(fd, ADC_DIG_RES, sizeof(ADC_DIG_RES)) != sizeof(ADC_DIG_RES)) {
												exit(3);
										}

										if (write(fd, ADC_PDWN, sizeof(ADC_PDWN)) != sizeof(ADC_PDWN)) {
												exit(3);
										}


										if (write(fd, NormalMode, sizeof(NormalMode)) != sizeof(NormalMode)) {
												exit(3);
										}



										/*
 *
 *
 *
										if (read(fd, rd_buf, sizeof(rd_buf)) != sizeof(rd_buf))
										                exit(3);
										if (read(fd, rd_buf, ARRAY_SIZE(rd_buf)) != ARRAY_SIZE(rd_buf))
												perror("Read Error");
*/
										close(fd);
										usleep (100);


			printf("Done!\n\r");

/*
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

			//////////
			// Init SPIdev
			//////////
			int spi_init(char filename[40])
			    {
			        int file;
			    __u8    mode, lsb, bits;
			    __u32 speed=2500000;

			        if ((file = open(filename,O_RDWR)) < 0)
			        {
			            printf("Failed to open the bus.");

			        com_serial=0;
			            exit(1);
			            }

			        ///////////////
			        // Verifications
			        ///////////////

			            if (ioctl(file, SPI_IOC_RD_MODE, &mode) < 0)
			                {
			                perror("SPI rd_mode");
			                return;
			                }
			            if (ioctl(file, SPI_IOC_RD_LSB_FIRST, &lsb) < 0)
			                {
			                perror("SPI rd_lsb_fist");
			                return;
			                }
			            if (ioctl(file, SPI_IOC_RD_BITS_PER_WORD, &bits) < 0)
			                {
			                perror("SPI bits_per_word");
			                return;
			                }

			            if (ioctl(file, SPI_IOC_RD_MAX_SPEED_HZ, &speed) < 0)
			                {
			                perror("SPI max_speed_hz");
			                return;
			                }


			    printf("%s: spi mode %d, %d bits %sper word, %d Hz max\n",filename, mode, bits, lsb ? "(lsb first) " : "", speed);

			    //xfer[0].tx_buf = (unsigned long)buf;
			    xfer[0].len = 3; // Length of  command to write
			    xfer[0].cs_change = 0; // Keep CS activated
			    xfer[0].delay_usecs = 0, //delay in us
			    xfer[0].speed_hz = 2500000, //speed
			    xfer[0].bits_per_word = 8, // bites per word 8

			    //xfer[1].rx_buf = (unsigned long) buf2;
			    xfer[1].len = 4; // Length of Data to read
			    xfer[1].cs_change = 0; // Keep CS activated
			    xfer[0].delay_usecs = 0;
			    xfer[0].speed_hz = 2500000;
			    xfer[0].bits_per_word = 8;

			    return file;
			    }





*/




}


//////////
// Read n bytes from the 2 bytes add1 add2 address
//////////

void  spi_read(int add1,int add2,int nbytes,int file)
    {
    int status;

    memset(buf, 0, sizeof buf);
    memset(buf2, 0, sizeof buf2);
    buf[0] = 0x01;
    buf[1] = add1;
    buf[2] = add2;
    xfer[0].tx_buf = (unsigned long)buf;
    xfer[0].len = 3; // Length of  command to write
    xfer[1].rx_buf = (unsigned long) buf2;
    xfer[1].len = nbytes; // Length of Data to read
    status = ioctl(file, SPI_IOC_MESSAGE(2), xfer);
    if (status < 0)
        {
        perror("SPI_IOC_MESSAGE");
        return;
        }
    //printf("env: %02x %02x %02x\n", buf[0], buf[1], buf[2]);
    //printf("ret: %02x %02x %02x %02x\n", buf2[0], buf2[1], buf2[2], buf2[3]);

    com_serial=1;
    failcount=0;
    return buf2;
    }

//////////
// Write n bytes int the 2 bytes address add1 add2
//////////
void spi_write(int add1,int add2,int nbytes,char value[10],int file)
    {
    unsigned char   buf[32], buf2[32];
    int status;

    memset(buf, 0, sizeof buf);
    memset(buf2, 0, sizeof buf2);
    buf[0] = 0x00;
    buf[1] = add1;
    buf[2] = add2;
    if (nbytes>=1) buf[3] = value[0];
    if (nbytes>=2) buf[4] = value[1];
    if (nbytes>=3) buf[5] = value[2];
    if (nbytes>=4) buf[6] = value[3];
    xfer[0].tx_buf = (unsigned long)buf;
    xfer[0].len = nbytes+3; // Length of  command to write
    status = ioctl(file, SPI_IOC_MESSAGE(1), xfer);
    if (status < 0)
        {
        perror("SPI_IOC_MESSAGE");
        return;
        }
    //printf("env: %02x %02x %02x\n", buf[0], buf[1], buf[2]);
    //printf("ret: %02x %02x %02x %02x\n", buf2[0], buf2[1], buf2[2], buf2[3]);

    com_serial=1;
    failcount=0;
    }



/*

#include <stdint.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <linux/types.h>
#include <linux/spi/spidev.h>

char buf[10];
char buf2[10];
extern int com_serial;
extern int failcount;
struct spi_ioc_transfer xfer[2];


//////////
// Init SPIdev
//////////
int spi_init(char filename[40])
    {
        int file;
    __u8    mode, lsb, bits;
    __u32 speed=2500000;

        if ((file = open(filename,O_RDWR)) < 0)
        {
            printf("Failed to open the bus.");

        com_serial=0;
            exit(1);
            }

        ///////////////
        // Verifications
        ///////////////

            if (ioctl(file, SPI_IOC_RD_MODE, &mode) < 0)
                {
                perror("SPI rd_mode");
                return;
                }
            if (ioctl(file, SPI_IOC_RD_LSB_FIRST, &lsb) < 0)
                {
                perror("SPI rd_lsb_fist");
                return;
                }
            if (ioctl(file, SPI_IOC_RD_BITS_PER_WORD, &bits) < 0)
                {
                perror("SPI bits_per_word");
                return;
                }

            if (ioctl(file, SPI_IOC_RD_MAX_SPEED_HZ, &speed) < 0)
                {
                perror("SPI max_speed_hz");
                return;
                }


    printf("%s: spi mode %d, %d bits %sper word, %d Hz max\n",filename, mode, bits, lsb ? "(lsb first) " : "", speed);

    //xfer[0].tx_buf = (unsigned long)buf;
    xfer[0].len = 3; // Length of  command to write
    xfer[0].cs_change = 0; // Keep CS activated
    xfer[0].delay_usecs = 0, //delay in us
    xfer[0].speed_hz = 2500000, //speed
    xfer[0].bits_per_word = 8, // bites per word 8

    //xfer[1].rx_buf = (unsigned long) buf2;
    xfer[1].len = 4; // Length of Data to read
    xfer[1].cs_change = 0; // Keep CS activated
    xfer[0].delay_usecs = 0;
    xfer[0].speed_hz = 2500000;
    xfer[0].bits_per_word = 8;

    return file;
    }
*/



